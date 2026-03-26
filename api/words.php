<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'nomelofa_korean');
define('DB_USER', 'nomelofa_korean');
define('DB_PASS', 'Korean258963');

function getDB() {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Ошибка подключения к БД: ' . $e->getMessage()]);
        exit();
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id, korean, russian, category, score, level, consecutive_correct, last_reviewed FROM words ORDER BY id ASC');
    $words = $stmt->fetchAll();
    foreach ($words as &$w) {
        $w['id']                  = (int) $w['id'];
        $w['score']               = (int) $w['score'];
        $w['level']               = (int) $w['level'];
        $w['consecutive_correct'] = (int) $w['consecutive_correct'];
    }
    echo json_encode($words, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['korean']) || empty($data['russian'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Поля korean и russian обязательны']);
        exit();
    }
    $stmt = $pdo->prepare('INSERT INTO words (korean, russian, category, score, level, consecutive_correct) VALUES (:korean, :russian, :category, :score, :level, :consecutive_correct)');
    $stmt->execute([
        ':korean'              => trim($data['korean']),
        ':russian'             => trim($data['russian']),
        ':category'            => trim($data['category'] ?? 'Не указано'),
        ':score'               => (int)($data['score'] ?? 0),
        ':level'               => (int)($data['level'] ?? 1),
        ':consecutive_correct' => (int)($data['consecutive_correct'] ?? 0),
    ]);
    echo json_encode([
        'id'                  => (int) $pdo->lastInsertId(),
        'korean'              => trim($data['korean']),
        'russian'             => trim($data['russian']),
        'category'            => trim($data['category'] ?? 'Не указано'),
        'score'               => (int)($data['score'] ?? 0),
        'level'               => (int)($data['level'] ?? 1),
        'consecutive_correct' => (int)($data['consecutive_correct'] ?? 0),
        'last_reviewed'       => null,
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'PUT') {
    $id   = (int) ($_GET['id'] ?? 0);
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Не указан id']);
        exit();
    }
    $stmt = $pdo->prepare('UPDATE words SET korean=:korean, russian=:russian, category=:category, score=:score, level=:level, consecutive_correct=:consecutive_correct, last_reviewed=:last_reviewed WHERE id=:id');
    $stmt->execute([
        ':korean'              => trim($data['korean']),
        ':russian'             => trim($data['russian']),
        ':category'            => trim($data['category'] ?? 'Не указано'),
        ':score'               => (int)($data['score'] ?? 0),
        ':level'               => (int)($data['level'] ?? 1),
        ':consecutive_correct' => (int)($data['consecutive_correct'] ?? 0),
        ':last_reviewed'       => $data['last_reviewed'] ?? null,
        ':id'                  => $id,
    ]);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Не указан id']);
        exit();
    }
    $stmt = $pdo->prepare('DELETE FROM words WHERE id = :id');  // исправлено: было $do
    $stmt->execute([':id' => $id]);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit();
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']);