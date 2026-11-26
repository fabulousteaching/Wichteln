<?php
// Wichteln – Schnittstelle für Beamer und Tablets (alle Anfragen an /api/…)
declare(strict_types=1);

define('WICHTEL', true);
require __DIR__ . '/wichtel-app/wichtel.php';

run_api();
