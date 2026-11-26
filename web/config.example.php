<?php
// Optionale Einstellungen für das Wichtel-Tool.
// Zum Verwenden diese Datei kopieren und als "config.php" speichern (im selben Ordner).
// config.php wird bei Updates nicht überschrieben.

return [
    // Wenn gesetzt, braucht es dieses Passwort, um NEUE Wichtelrunden zu erstellen.
    // Praktisch, weil die Adresse öffentlich erreichbar ist. Leer lassen = kein Passwort.
    'teacher_password' => '',

    // Nach wie vielen Tagen ohne Änderung eine Runde automatisch gelöscht wird.
    'retention_days' => 120,

    // Feste Adresse für den QR-Code, z. B. 'https://wichteln.deinedomain.ch'.
    // Normalerweise nicht nötig (wird automatisch erkannt).
    'public_url' => '',
];
