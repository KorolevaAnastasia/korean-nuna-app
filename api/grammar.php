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
        return new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Ошибка подключения к БД: ' . $e->getMessage()]);
        exit();
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM grammar ORDER BY id ASC');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['id'] = (int) $r['id'];
    }
    echo json_encode($rows, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['pattern']) || empty($data['translation'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Поля pattern и translation обязательны']);
        exit();
    }
    $stmt = $pdo->prepare(
        'INSERT INTO grammar (pattern, translation, structure, examples, category)
         VALUES (:pattern, :translation, :structure, :examples, :category)'
    );
    $stmt->execute([
        ':pattern'     => trim($data['pattern']),
        ':translation' => trim($data['translation']),
        ':structure'   => trim($data['structure'] ?? ''),
        ':examples'    => trim($data['examples'] ?? ''),
        ':category'    => trim($data['category'] ?? 'Общее'),
    ]);
    echo json_encode([
        'id'          => (int) $pdo->lastInsertId(),
        'pattern'     => trim($data['pattern']),
        'translation' => trim($data['translation']),
        'structure'   => trim($data['structure'] ?? ''),
        'examples'    => trim($data['examples'] ?? ''),
        'category'    => trim($data['category'] ?? 'Общее'),
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'PUT') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Не указан id']);
        exit();
    }
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare(
        'UPDATE grammar
         SET pattern=:pattern, translation=:translation, structure=:structure,
             examples=:examples, category=:category
         WHERE id=:id'
    );
    $stmt->execute([
        ':pattern'     => trim($data['pattern']),
        ':translation' => trim($data['translation']),
        ':structure'   => trim($data['structure'] ?? ''),
        ':examples'    => trim($data['examples'] ?? ''),
        ':category'    => trim($data['category'] ?? 'Общее'),
        ':id'          => $id,
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
    $pdo->prepare('DELETE FROM grammar WHERE id = :id')->execute([':id' => $id]);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit();
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']);