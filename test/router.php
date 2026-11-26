<?php
// Ahmt die .htaccess-Regeln für den eingebauten PHP-Server nach (nur für Tests/Entwicklung):
//   php -S localhost:8000 -t web test/router.php
$path = (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = $_SERVER['DOCUMENT_ROOT'];

$page = static function (string $file) use ($root): bool {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    readfile("$root/$file");
    return true;
};

if (preg_match('#^/(lib|data)(/|$)#', $path)) {
    http_response_code(403);
    return true;
}
if (str_starts_with($path, '/api/')) {
    require "$root/api.php";
    return true;
}
if (preg_match('#^/lehrer/[A-Za-z0-9]+/?$#', $path)) return $page('lehrer.html');
if (preg_match('#^/k/[A-Za-z0-9]+/?$#', $path)) return $page('kind.html');
if ($path === '/' || $path === '/k' || $path === '/k/') return $page('index.html');
if (str_ends_with($path, '.woff2') && is_file($root . $path)) {
    header('Content-Type: font/woff2');
    readfile($root . $path);
    return true;
}
return false; // statische Datei
