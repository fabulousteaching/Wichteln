<?php
// Wichteln – Server-Logik (PHP). Wird von api.php eingebunden.
declare(strict_types=1);

defined('WICHTEL') || exit;

const MIN_CHILDREN = 3;
const LIMITS = ['title' => 60, 'hint' => 240, 'name' => 30, 'wishes' => 800, 'nogos' => 800, 'children' => 60];
// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L), damit Kinder den Code auch abtippen können.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
// Jede Datenseite beginnt mit dieser Zeile: Ruft jemand die Datei im Browser auf, kommt nichts heraus.
const FILE_GUARD = "<?php http_response_code(404); exit; ?>\n";

final class HttpError extends Exception
{
    public function __construct(public int $status, string $message, public array $extra = [])
    {
        parent::__construct($message);
    }
}

function now_ms(): int
{
    return (int) floor(microtime(true) * 1000);
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

function config(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $cfg = [
        'teacher_password' => '',
        'public_url' => '',
        'retention_days' => 120,
        'data_dir' => dirname(__DIR__) . '/data',
    ];
    $file = dirname(__DIR__) . '/config.php';
    if (is_file($file)) {
        $user = include $file;
        if (is_array($user)) $cfg = array_merge($cfg, $user);
    }
    // Für Tests und besondere Installationen auch per Umgebungsvariable
    foreach (['WICHTEL_DATA_DIR' => 'data_dir', 'TEACHER_PASSWORD' => 'teacher_password', 'PUBLIC_URL' => 'public_url'] as $env => $key) {
        $value = getenv($env);
        if ($value !== false && $value !== '') $cfg[$key] = $value;
    }
    return $cfg;
}

// ---------------------------------------------------------------------------
// Speicher: eine geschützte JSON-Datei pro Wichtelrunde
// ---------------------------------------------------------------------------

function data_dir(string $sub = ''): string
{
    $dir = rtrim((string) config()['data_dir'], '/') . ($sub !== '' ? "/$sub" : '');
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new HttpError(500, 'Der Ordner „data“ ist nicht beschreibbar. Bitte die Schreibrechte prüfen.');
    }
    return $dir;
}

function round_path(string $code): string
{
    return data_dir('rounds') . "/$code.json.php";
}

function read_data_file(string $path): ?array
{
    if (!is_file($path)) return null;
    $raw = @file_get_contents($path);
    if ($raw === false) return null;
    if (str_starts_with($raw, FILE_GUARD)) $raw = substr($raw, strlen(FILE_GUARD));
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function write_data_file(string $path, array $data): void
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if ($json === false || @file_put_contents($tmp, FILE_GUARD . $json) === false) {
        @unlink($tmp);
        throw new HttpError(500, 'Speichern fehlgeschlagen. Ist der Ordner „data“ beschreibbar?');
    }
    // rename ersetzt die Datei in einem Schritt: Lesende sehen nie eine halbe Datei.
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        throw new HttpError(500, 'Speichern fehlgeschlagen.');
    }
}

/** Führt $fn exklusiv für eine Datei aus (Sperre über eine .lock-Datei). */
function with_lock(string $lockPath, callable $fn): mixed
{
    $fh = @fopen($lockPath, 'c');
    if (!$fh) throw new HttpError(500, 'Der Ordner „data“ ist nicht beschreibbar.');
    try {
        flock($fh, LOCK_EX);
        return $fn();
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function load_round(string $code): array
{
    $round = read_data_file(round_path($code));
    if (!$round) throw new HttpError(404, 'Diese Wichtelrunde gibt es nicht (mehr). Bitte den Code prüfen.');
    return $round;
}

/**
 * Ändert eine Runde sicher (gesperrt, atomar gespeichert).
 * $fn bekommt die Runde per Referenz und darf eine HttpError werfen.
 * @return array{0: array, 1: mixed} [neue Runde, Rückgabe von $fn]
 */
function mutate_round(string $code, callable $fn): array
{
    if ($code === '' || !is_file(round_path($code))) load_round($code); // wirft 404
    return with_lock(data_dir('rounds') . "/$code.lock", function () use ($code, $fn) {
        $round = load_round($code);
        $result = $fn($round);
        $round['updated_at'] = max(now_ms(), (int) ($round['updated_at'] ?? 0) + 1);
        write_data_file(round_path($code), $round);
        return [$round, $result];
    });
}

function delete_round_files(string $code): void
{
    @unlink(round_path($code));
    @unlink(data_dir('rounds') . "/$code.lock");
}

/** Löscht Runden, die lange nicht mehr verändert wurden. */
function cleanup_old_rounds(): void
{
    $days = max(1, (int) config()['retention_days']);
    $limit = time() - $days * 86400;
    foreach (glob(data_dir('rounds') . '/*.json.php') ?: [] as $file) {
        if (@filemtime($file) < $limit) delete_round_files(basename($file, '.json.php'));
    }
    foreach (glob(data_dir('rounds') . '/*.tmp') ?: [] as $file) {
        if (@filemtime($file) < time() - 3600) @unlink($file);
    }
}

/** Einfache Bremse gegen massenhaftes Anlegen von Runden (pro IP und Stunde). */
function rate_limit_ok(string $key, int $max, int $windowSeconds): bool
{
    $path = data_dir() . '/ratelimit.json.php';
    return with_lock(data_dir() . '/ratelimit.lock', function () use ($path, $key, $max, $windowSeconds) {
        $data = read_data_file($path) ?? [];
        $now = time();
        foreach ($data as $k => $hits) {
            $data[$k] = array_values(array_filter((array) $hits, fn($t) => $now - (int) $t < $windowSeconds));
            if (!$data[$k]) unset($data[$k]);
        }
        $id = hash('sha256', $key);
        $data[$id][] = $now;
        write_data_file($path, $data);
        return count($data[$id]) <= $max;
    });
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function random_code(): string
{
    $code = '';
    for ($i = 0; $i < CODE_LENGTH; $i++) $code .= CODE_ALPHABET[random_int(0, strlen(CODE_ALPHABET) - 1)];
    return $code;
}

function normalize_code(?string $value): string
{
    return substr(preg_replace('/[^A-Z0-9]/', '', strtoupper((string) $value)), 0, 12);
}

function random_token(): string
{
    return rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
}

function hash_token(string $token): string
{
    return hash('sha256', $token);
}

function token_matches(mixed $token, ?string $hash): bool
{
    return is_string($token) && $token !== '' && is_string($hash) && $hash !== '' && hash_equals($hash, hash_token($token));
}

/** Entfernt Steuerzeichen, vereinheitlicht Zeilenumbrüche und kürzt auf die erlaubte Länge. */
function clean_text(mixed $value, int $max, bool $multiline = false): string
{
    $t = is_string($value) ? $value : '';
    if (!mb_check_encoding($t, 'UTF-8')) $t = mb_convert_encoding($t, 'UTF-8', 'UTF-8');
    if (class_exists('Normalizer')) $t = Normalizer::normalize($t, Normalizer::FORM_C) ?: $t;
    $t = preg_replace("/\r\n?/", "\n", $t);
    $t = preg_replace($multiline ? '/[\x00-\x09\x0B-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u', '', $t);
    if ($multiline) {
        $t = implode("\n", array_map(fn($l) => preg_replace('/\s+$/u', '', $l), explode("\n", $t)));
        $t = preg_replace("/\n{3,}/", "\n\n", $t);
    } else {
        $t = preg_replace('/\s+/u', ' ', $t);
    }
    $t = preg_replace('/^\s+|\s+$/u', '', $t);
    return mb_substr($t, 0, $max);
}

/** Namensliste: Array oder Text mit einem Namen pro Zeile (oder mit Komma getrennt). */
function parse_names(mixed $value): array
{
    $raw = is_array($value) ? $value : preg_split('/[\n,;]+/', (string) ($value ?? ''));
    $names = [];
    foreach ($raw as $entry) {
        $name = clean_text(is_string($entry) ? $entry : '', LIMITS['name']);
        if ($name !== '') $names[] = $name;
    }
    return $names;
}

function find_duplicate(array $names): ?string
{
    $seen = [];
    foreach ($names as $name) {
        $key = mb_strtolower($name);
        if (isset($seen[$key])) return $name;
        $seen[$key] = true;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Auslosung
// ---------------------------------------------------------------------------

/** Fisher-Yates mit kryptografisch sicherem Zufall. */
function secure_shuffle(array $list): array
{
    $list = array_values($list);
    for ($i = count($list) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        [$list[$i], $list[$j]] = [$list[$j], $list[$i]];
    }
    return $list;
}

/**
 * Ein einziger grosser Kreis: A → B → C → … → A.
 * Niemand beschenkt sich selbst, und es gibt keine gegenseitigen Paare (ab 3 Kindern).
 * @return array<int,int> schenkende ID → beschenkte ID
 */
function draw_circle(array $ids): array
{
    if (count($ids) < MIN_CHILDREN) {
        throw new HttpError(400, 'Für die Auslosung braucht es mindestens ' . MIN_CHILDREN . ' Kinder.');
    }
    $order = secure_shuffle($ids);
    $n = count($order);
    $result = [];
    foreach ($order as $i => $id) $result[$id] = $order[($i + 1) % $n];
    return $result;
}

/** Zeitplan der Wichtel-Parade am Beamer (die Tablets bekommen den Zettel danach). */
function parade_timing(int $giftCount): array
{
    $n = max(0, $giftCount);
    $lead = 900;
    $cycle = 6500;
    $outro = 800;
    $stagger = $n > 1 ? min(700, max(250, (int) round(7000 / $n))) : 0;
    $total = $n === 0 ? $lead + 1200 : $lead + ($n - 1) * $stagger + $cycle + $outro;
    return ['count' => $n, 'lead' => $lead, 'stagger' => $stagger, 'cycle' => $cycle, 'total' => $total];
}

// ---------------------------------------------------------------------------
// Zustand für Lehrperson und Kinder
// ---------------------------------------------------------------------------

function sorted_children(array $round): array
{
    $children = $round['children'] ?? [];
    usort($children, fn($a, $b) => [$a['position'], $a['id']] <=> [$b['position'], $b['id']]);
    return $children;
}

function &find_child(array &$round, mixed $id): array
{
    $childId = filter_var($id, FILTER_VALIDATE_INT);
    foreach ($round['children'] as &$child) {
        if ($childId !== false && $child['id'] === $childId) return $child;
    }
    unset($child);
    throw new HttpError(404, 'Dieses Kind gibt es in der Wichtelrunde nicht.');
}

function base_url(): string
{
    $public = (string) config()['public_url'];
    if ($public !== '') return rtrim($public, '/');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
        || (string) ($_SERVER['SERVER_PORT'] ?? '') === '443';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    if (!preg_match('/^[A-Za-z0-9.\-:\[\]]+$/', $host)) $host = 'localhost';
    return ($https ? 'https' : 'http') . '://' . $host;
}

function admin_state(array $round): array
{
    return [
        'round' => [
            'code' => $round['code'],
            'title' => $round['title'],
            'hint' => $round['hint'],
            'created_at' => $round['created_at'],
            'drawn_at' => $round['drawn_at'],
            'parade' => $round['parade'],
        ],
        'children' => array_map(fn($c) => [
            'id' => $c['id'],
            'name' => $c['name'],
            'claimed' => (bool) $c['device_hash'],
            'done' => (bool) $c['done_at'],
            'has_note' => $c['wishes'] !== '' || $c['nogos'] !== '',
            'revealed' => (bool) $c['revealed_at'],
        ], sorted_children($round)),
        'kid_url' => base_url() . '/k/' . $round['code'],
        'min_children' => MIN_CHILDREN,
        'server_now' => now_ms(),
    ];
}

function reveal_info(array $round, array $child): ?array
{
    if (!$round['drawn_at'] || !$child['giftee_id']) return null;
    // Erst wenn alle Wichtel vom Beamer weggelaufen sind, kommen sie auf den Tablets an.
    $revealAt = $round['drawn_at'] + (int) ($round['parade']['total'] ?? 0) + (int) $child['reveal_delay'];
    $inMs = max(0, $revealAt - now_ms());
    $giftee = null;
    foreach ($round['children'] as $c) {
        if ($c['id'] === $child['giftee_id']) $giftee = $c;
    }
    return [
        'in_ms' => $inMs,
        'giftee' => $inMs === 0 && $giftee ? ['name' => $giftee['name'], 'wishes' => $giftee['wishes'], 'nogos' => $giftee['nogos']] : null,
    ];
}

function kid_state(array $round, array $child): array
{
    return [
        'round' => ['code' => $round['code'], 'title' => $round['title'], 'hint' => $round['hint'], 'drawn' => (bool) $round['drawn_at']],
        'me' => [
            'id' => $child['id'],
            'name' => $child['name'],
            'wishes' => $child['wishes'],
            'nogos' => $child['nogos'],
            'done' => (bool) $child['done_at'],
            'revealed' => (bool) $child['revealed_at'],
        ],
        'reveal' => reveal_info($round, $child),
    ];
}

function new_child(int $id, string $name, int $position): array
{
    return [
        'id' => $id, 'name' => $name, 'position' => $position, 'device_hash' => null, 'claimed_at' => null,
        'wishes' => '', 'nogos' => '', 'done_at' => null, 'giftee_id' => null, 'reveal_delay' => 0,
        'revealed_at' => null, 'updated_at' => now_ms(),
    ];
}

function read_note(array $body): array
{
    return [
        'wishes' => clean_text($body['wishes'] ?? '', LIMITS['wishes'], true),
        'nogos' => clean_text($body['nogos'] ?? '', LIMITS['nogos'], true),
    ];
}

function duplicate_error(string $dup): HttpError
{
    return new HttpError(400, "Der Name „{$dup}“ kommt doppelt vor. Bitte z. B. „{$dup} M.“ schreiben.");
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

function header_value(string $name): string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return (string) ($_SERVER[$key] ?? '');
}

function require_admin(string $code): array
{
    $round = load_round($code);
    if (!token_matches(header_value('X-Admin-Token'), $round['admin_hash'])) {
        throw new HttpError(403, 'Kein Zugriff. Bitte den Lehrer-Link verwenden.');
    }
    return $round;
}

function check_kid(array &$round, mixed $id): array
{
    $child = find_child($round, $id);
    if (!$child['device_hash'] || !token_matches(header_value('X-Device-Token'), $child['device_hash'])) {
        throw new HttpError(403, 'Dieser Name ist auf einem anderen Gerät ausgewählt. Bitte frag deine Lehrperson.');
    }
    return $child;
}

/** Bearbeitet eine API-Anfrage und gibt [Status, Daten] zurück. */
function handle_api(string $method, string $path, array $body): array
{
    // ----- Allgemein -----
    if ($method === 'GET' && $path === 'config') {
        return [200, ['password_required' => (string) config()['teacher_password'] !== '', 'limits' => LIMITS, 'min_children' => MIN_CHILDREN]];
    }

    // ----- Neue Runde -----
    if ($method === 'POST' && $path === 'rounds') {
        $pw = (string) config()['teacher_password'];
        if ($pw !== '' && !hash_equals(hash_token($pw), hash_token(is_string($body['password'] ?? null) ? $body['password'] : ''))) {
            throw new HttpError(401, 'Das Passwort stimmt nicht.');
        }
        if (!rate_limit_ok((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 30, 3600)) {
            throw new HttpError(429, 'Zu viele neue Runden in kurzer Zeit. Bitte später nochmal versuchen.');
        }
        cleanup_old_rounds();
        $title = clean_text($body['title'] ?? '', LIMITS['title']) ?: 'Unsere Klasse';
        $hint = clean_text($body['hint'] ?? '', LIMITS['hint']);
        $names = parse_names($body['names'] ?? '');
        if (count($names) > LIMITS['children']) throw new HttpError(400, 'Höchstens ' . LIMITS['children'] . ' Kinder pro Runde.');
        if ($dup = find_duplicate($names)) throw duplicate_error($dup);

        $code = '';
        for ($i = 0; $i < 30; $i++) {
            $code = random_code();
            if (!is_file(round_path($code))) break;
        }
        $token = random_token();
        $now = now_ms();
        $children = [];
        foreach ($names as $i => $name) $children[] = new_child($i + 1, $name, $i);
        $round = [
            'code' => $code, 'admin_hash' => hash_token($token), 'title' => $title, 'hint' => $hint,
            'drawn_at' => null, 'parade' => null, 'created_at' => $now, 'updated_at' => $now,
            'next_id' => count($children) + 1, 'children' => $children,
        ];
        with_lock(data_dir('rounds') . "/$code.lock", function () use ($code, $round) {
            if (is_file(round_path($code))) throw new HttpError(500, 'Bitte nochmal versuchen.');
            write_data_file(round_path($code), $round);
        });
        return [201, ['code' => $code, 'admin_token' => $token]];
    }

    if (!preg_match('#^rounds/([^/]+)(?:/(.*))?$#', $path, $m)) throw new HttpError(404, 'Nicht gefunden.');
    $code = normalize_code(urldecode($m[1]));
    $rest = $m[2] ?? '';

    // ----- Live-Abfrage: hat sich etwas geändert? -----
    if ($method === 'GET' && $rest === 'version') {
        $round = load_round($code);
        return [200, ['v' => $round['updated_at'], 'drawn' => (bool) $round['drawn_at']]];
    }

    // ----- Lehrperson -----
    if (str_starts_with($rest, 'admin')) {
        require_admin($code);
        $sub = substr($rest, strlen('admin'));

        if ($sub === '' && $method === 'GET') return [200, admin_state(load_round($code))];

        if ($sub === '' && $method === 'PATCH') {
            [$round] = mutate_round($code, function (array &$round) use ($body) {
                if (array_key_exists('title', $body)) $round['title'] = clean_text($body['title'], LIMITS['title']) ?: $round['title'];
                if (array_key_exists('hint', $body)) $round['hint'] = clean_text($body['hint'], LIMITS['hint']);
            });
            return [200, admin_state($round)];
        }

        if ($sub === '' && $method === 'DELETE') {
            with_lock(data_dir('rounds') . "/$code.lock", fn() => @unlink(round_path($code)));
            @unlink(data_dir('rounds') . "/$code.lock");
            return [200, ['ok' => true]];
        }

        if ($sub === '/children' && $method === 'POST') {
            [$round] = mutate_round($code, function (array &$round) use ($body) {
                if ($round['drawn_at']) throw new HttpError(409, 'Nach der Auslosung können keine Kinder mehr dazukommen.');
                $names = parse_names($body['names'] ?? '');
                if (!$names) throw new HttpError(400, 'Bitte mindestens einen Namen eingeben.');
                if (count($round['children']) + count($names) > LIMITS['children']) {
                    throw new HttpError(400, 'Höchstens ' . LIMITS['children'] . ' Kinder pro Runde.');
                }
                $existing = array_map(fn($c) => $c['name'], $round['children']);
                if ($dup = find_duplicate([...$existing, ...$names])) throw duplicate_error($dup);
                $pos = $round['children'] ? max(array_map(fn($c) => $c['position'], $round['children'])) : -1;
                foreach ($names as $name) $round['children'][] = new_child($round['next_id']++, $name, ++$pos);
            });
            return [200, admin_state($round)];
        }

        if (preg_match('#^/children/(\d+)(?:/(release|reopen))?$#', $sub, $cm)) {
            $id = (int) $cm[1];
            $action = $cm[2] ?? '';
            if ($action === '' && $method === 'PATCH') {
                [$round] = mutate_round($code, function (array &$round) use ($id, $body) {
                    $child = &find_child($round, $id);
                    $name = clean_text($body['name'] ?? '', LIMITS['name']);
                    if ($name === '') throw new HttpError(400, 'Der Name darf nicht leer sein.');
                    $others = array_map(fn($c) => $c['name'], array_filter($round['children'], fn($c) => $c['id'] !== $id));
                    if (find_duplicate([...$others, $name])) throw new HttpError(400, "„{$name}“ gibt es schon.");
                    $child['name'] = $name;
                    $child['updated_at'] = now_ms();
                });
                return [200, admin_state($round)];
            }
            if ($action === '' && $method === 'DELETE') {
                [$round] = mutate_round($code, function (array &$round) use ($id) {
                    find_child($round, $id);
                    if ($round['drawn_at']) throw new HttpError(409, 'Nach der Auslosung kann niemand mehr entfernt werden.');
                    $round['children'] = array_values(array_filter($round['children'], fn($c) => $c['id'] !== $id));
                });
                return [200, admin_state($round)];
            }
            if ($action === 'release' && $method === 'POST') {
                [$round] = mutate_round($code, function (array &$round) use ($id) {
                    $child = &find_child($round, $id);
                    $child['device_hash'] = null;
                    $child['claimed_at'] = null;
                    $child['updated_at'] = now_ms();
                });
                return [200, admin_state($round)];
            }
            if ($action === 'reopen' && $method === 'POST') {
                [$round] = mutate_round($code, function (array &$round) use ($id) {
                    $child = &find_child($round, $id);
                    $child['done_at'] = null;
                    $child['updated_at'] = now_ms();
                });
                return [200, admin_state($round)];
            }
        }

        if ($sub === '/draw' && $method === 'POST') {
            $missing = null;
            [$round] = mutate_round($code, function (array &$round) use ($body, &$missing) {
                if ($round['drawn_at']) throw new HttpError(409, 'Es wurde schon ausgelost.');
                $children = sorted_children($round);
                if (count($children) < MIN_CHILDREN) {
                    throw new HttpError(400, 'Für die Auslosung braucht es mindestens ' . MIN_CHILDREN . ' Kinder.');
                }
                $notDone = array_values(array_map(fn($c) => $c['name'], array_filter($children, fn($c) => !$c['done_at'])));
                if ($notDone && empty($body['force'])) {
                    throw new HttpError(409, 'Noch nicht alle Zettel sind fertig.', ['missing' => $notDone]);
                }
                $circle = draw_circle(array_map(fn($c) => $c['id'], $children));
                $giftIds = array_values(array_map(fn($c) => $c['id'], array_filter($children, fn($c) => (bool) $c['done_at'])));
                $now = now_ms();
                foreach ($round['children'] as &$child) {
                    $child['giftee_id'] = $circle[$child['id']];
                    $child['reveal_delay'] = 300 + random_int(0, 2199);
                    $child['revealed_at'] = null;
                    $child['updated_at'] = $now;
                }
                unset($child);
                $round['drawn_at'] = $now;
                $round['parade'] = parade_timing(count($giftIds)) + ['gift_ids' => $giftIds];
            });
            return [200, admin_state($round)];
        }

        if ($sub === '/undraw' && $method === 'POST') {
            [$round] = mutate_round($code, function (array &$round) {
                foreach ($round['children'] as &$child) {
                    $child['giftee_id'] = null;
                    $child['reveal_delay'] = 0;
                    $child['revealed_at'] = null;
                }
                unset($child);
                $round['drawn_at'] = null;
                $round['parade'] = null;
            });
            return [200, admin_state($round)];
        }

        if ($sub === '/pairs' && $method === 'GET') {
            $round = load_round($code);
            if (!$round['drawn_at']) throw new HttpError(409, 'Es wurde noch nicht ausgelost.');
            $byId = [];
            foreach ($round['children'] as $c) $byId[$c['id']] = $c;
            return [200, array_map(function ($c) use ($byId) {
                $g = $byId[$c['giftee_id']] ?? null;
                return [
                    'giver' => ['id' => $c['id'], 'name' => $c['name']],
                    'giftee' => $g ? ['id' => $g['id'], 'name' => $g['name'], 'wishes' => $g['wishes'], 'nogos' => $g['nogos']] : null,
                ];
            }, sorted_children($round))];
        }

        throw new HttpError(404, 'Nicht gefunden.');
    }

    // ----- Kinder -----
    if ($rest === 'kids' && $method === 'GET') {
        $round = load_round($code);
        return [200, [
            'round' => ['code' => $round['code'], 'title' => $round['title'], 'drawn' => (bool) $round['drawn_at']],
            'children' => array_map(fn($c) => [
                'id' => $c['id'], 'name' => $c['name'], 'taken' => (bool) $c['device_hash'], 'done' => (bool) $c['done_at'],
            ], sorted_children($round)),
        ]];
    }

    if (preg_match('#^kids/(\d+)(?:/(claim|note|done|reopen|revealed))?$#', $rest, $km)) {
        $id = (int) $km[1];
        $action = $km[2] ?? '';

        if ($action === 'claim' && $method === 'POST') {
            $offered = is_string($body['token'] ?? null) ? $body['token'] : '';
            [$round, $token] = mutate_round($code, function (array &$round) use ($id, $offered) {
                $child = &find_child($round, $id);
                if ($child['device_hash']) {
                    if (token_matches($offered, $child['device_hash'])) return $offered;
                    throw new HttpError(409, "„{$child['name']}“ wurde schon auf einem anderen Gerät ausgewählt. Wenn das du bist, frag deine Lehrperson.");
                }
                $token = random_token();
                $child['device_hash'] = hash_token($token);
                $child['claimed_at'] = now_ms();
                $child['updated_at'] = now_ms();
                return $token;
            });
            return [200, ['token' => $token, 'state' => kid_state($round, find_child($round, $id))]];
        }

        if ($action === '' && $method === 'GET') {
            $round = load_round($code);
            $child = check_kid($round, $id);
            return [200, kid_state($round, $child)];
        }

        if ($action === 'note' && $method === 'PUT') {
            mutate_round($code, function (array &$round) use ($id, $body) {
                check_kid($round, $id);
                $child = &find_child($round, $id);
                if ($child['done_at']) throw new HttpError(409, 'Dein Zettel ist schon verpackt.');
                $note = read_note($body);
                $child['wishes'] = $note['wishes'];
                $child['nogos'] = $note['nogos'];
                $child['updated_at'] = now_ms();
            });
            return [200, ['ok' => true]];
        }

        if ($action === 'done' && $method === 'POST') {
            [$round] = mutate_round($code, function (array &$round) use ($id, $body) {
                check_kid($round, $id);
                $child = &find_child($round, $id);
                if (!$child['done_at']) {
                    $note = read_note($body);
                    $child['wishes'] = $note['wishes'];
                    $child['nogos'] = $note['nogos'];
                    $child['done_at'] = now_ms();
                    $child['updated_at'] = now_ms();
                }
            });
            return [200, kid_state($round, find_child($round, $id))];
        }

        if ($action === 'reopen' && $method === 'POST') {
            [$round] = mutate_round($code, function (array &$round) use ($id) {
                check_kid($round, $id);
                if ($round['drawn_at']) {
                    throw new HttpError(409, 'Die Wichtel sind schon losgelaufen – jetzt kann der Zettel nicht mehr geändert werden.');
                }
                $child = &find_child($round, $id);
                $child['done_at'] = null;
                $child['updated_at'] = now_ms();
            });
            return [200, kid_state($round, find_child($round, $id))];
        }

        if ($action === 'revealed' && $method === 'POST') {
            mutate_round($code, function (array &$round) use ($id) {
                check_kid($round, $id);
                $child = &find_child($round, $id);
                if ($round['drawn_at'] && !$child['revealed_at']) $child['revealed_at'] = now_ms();
            });
            return [200, ['ok' => true]];
        }
    }

    throw new HttpError(404, 'Nicht gefunden.');
}

/** Einstiegspunkt für api.php */
function run_api(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');

    $status = 200;
    try {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        // Manche Webserver lassen nur GET/POST durch – daher PUT/PATCH/DELETE auch als POST + Kopfzeile
        $override = strtoupper(header_value('X-HTTP-Method-Override'));
        if ($method === 'POST' && in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) $method = $override;

        $uri = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
        $pos = strpos($uri, '/api/');
        $path = $pos === false ? '' : trim(substr($uri, $pos + 5), '/');

        $body = [];
        if ($method !== 'GET' && $method !== 'HEAD') {
            // Schreibende Anfragen nur als JSON (erzwingt die Sicherheitsprüfung des Browsers bei fremden Seiten)
            $type = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));
            if (!str_starts_with($type, 'application/json')) throw new HttpError(415, 'Anfragen müssen als JSON gesendet werden.');
            $raw = (string) file_get_contents('php://input', false, null, 0, 200000);
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (!is_array($decoded)) throw new HttpError(400, 'Ungültige Anfrage.');
                $body = $decoded;
            }
        }

        [$status, $data] = handle_api($method, $path, $body);
    } catch (HttpError $e) {
        $status = $e->status;
        $data = ['error' => $e->getMessage()] + $e->extra;
    } catch (Throwable $e) {
        error_log('Wichteln: ' . $e);
        $status = 500;
        $data = ['error' => 'Da ist etwas schiefgelaufen. Bitte nochmal versuchen.'];
    }
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
