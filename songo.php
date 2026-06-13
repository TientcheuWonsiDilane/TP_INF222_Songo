<?php
header('Content-Type: application/json');
session_start();

$jsonFile = 'games.json';

function readData($file) {
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

function saveData($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

$action = $_GET['action'] ?? '';
$games = readData($jsonFile);

if ($action === 'creer') {
    $code = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));
    
    $initial_tableau = array_fill(0, 18, 0);
    
    $path = [16, 15, 14, 13, 12, 11, 10, 1, 2, 3, 4, 5, 6, 7];
    foreach ($path as $index) {
        $initial_tableau[$index] = 5;
    }
    
    $games[$code] = [
        "tableau" => $initial_tableau,
        "scores" => ["1" => 0, "2" => 0],
        "current_player" => 1,
        "joueur1_present" => 1,
        "joueur2_present" => 0
    ];
    
    saveData($jsonFile, $games);
    
    $_SESSION['partie_code'] = $code;
    $_SESSION['role'] = 1; 
    
    echo json_encode(["success" => true, "code" => $code, "role" => 1]);
    exit;
}
if ($action === 'rejoindre') {
    $code = strtoupper($_GET['code'] ?? '');
    
    if (!isset($games[$code])) {
        echo json_encode(["success" => false, "message" => "Code invalide ou partie inexistante."]);
        exit;
    }
    
    $_SESSION['partie_code'] = $code;
    $_SESSION['role'] = 2;     
    $games[$code]['joueur2_present'] = 1;
    saveData($jsonFile, $games);
    
    echo json_encode(["success" => true, "code" => $code, "role" => 2]);
    exit;
}

if ($action === 'sync') {
    $code = $_SESSION['partie_code'] ?? '';
    if (!$code || !isset($games[$code])) { 
        echo json_encode(["error" => "Aucune partie active trouvée"]); 
        exit; 
    }
    
    $partie = $games[$code];
    
    echo json_encode([
        "tableau" => $partie['tableau'],
        "scores" => $partie['scores'],
        "current_player" => (int)$partie['current_player'],
        "ready" => ($partie['joueur1_present'] == 1 && $partie['joueur2_present'] == 1),
        "role" => $_SESSION['role']
    ]);
    exit;
}

if ($action === 'jouer') {
    $code = $_SESSION['partie_code'] ?? '';
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($code && $data && isset($games[$code])) {
        $data['tableau'][8] = 0;
        $data['tableau'][9] = 0;
        
        $games[$code]['tableau'] = $data['tableau'];
        $games[$code]['scores'] = $data['scores'];
        $games[$code]['current_player'] = $data['current_player'];
        
        saveData($jsonFile, $games);
        echo json_encode(["success" => true]);
    }
    exit;
}