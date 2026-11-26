<?php
// Prüft die Auslosung: niemand zieht sich selbst, keine gegenseitigen Paare, ein einziger Kreis.
declare(strict_types=1);
define('WICHTEL', true);
require __DIR__ . '/../web/lib/wichtel.php';

function fail(string $msg): never { fwrite(STDERR, $msg . "\n"); exit(1); }

for ($n = 3; $n <= 30; $n++) {
    $ids = range(1, $n);
    for ($run = 0; $run < 40; $run++) {
        $map = draw_circle($ids);
        if (count($map) !== $n) fail("n=$n: falsche Anzahl");
        $giftees = array_values($map);
        sort($giftees);
        if ($giftees !== $ids) fail("n=$n: nicht jede Person genau einmal beschenkt");
        foreach ($map as $giver => $giftee) {
            if ($giver === $giftee) fail("n=$n: jemand beschenkt sich selbst");
            if ($map[$giftee] === $giver) fail("n=$n: gegenseitiges Paar");
        }
        $seen = [];
        $cur = $ids[0];
        while (!isset($seen[$cur])) { $seen[$cur] = true; $cur = $map[$cur]; }
        if (count($seen) !== $n) fail("n=$n: kein einziger Kreis");
    }
}
try { draw_circle([1, 2]); fail('2 Kinder sollten nicht gehen'); } catch (HttpError $e) { /* gut */ }
foreach ([0, 1, 3, 10, 25, 60] as $n) {
    $t = parade_timing($n)['total'];
    if ($t < 1500 || $t >= 60000) fail("Parade n=$n total=$t");
}
if (clean_text("  Hallo\x07  Welt  ", 30) !== 'Hallo Welt') fail('clean_text einzeilig');
if (clean_text("a\r\n\r\n\r\n\r\nb  ", 30, true) !== "a\n\nb") fail('clean_text mehrzeilig');
if (find_duplicate(['Lena', 'max', 'Max']) !== 'Max') fail('find_duplicate');
if (parse_names("Lena\n Max ,Şeyma;;") !== ['Lena', 'Max', 'Şeyma']) fail('parse_names');
echo "ok\n";
