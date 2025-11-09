<?php
// Simple JSON storage API
// Methods:
//  - GET  /api/storage.php?key=<name>          -> returns JSON content
//  - POST /api/storage.php?key=<name> (body)   -> writes JSON content
//
// Allowed keys and their backing files
$allowed = [
  'savingsProgress' => __DIR__ . '/../data/savingsProgress.json',
  'calcHistory'     => __DIR__ . '/../data/calcHistory.json',
  'themeVars'       => __DIR__ . '/../data/themeVars.json',
];

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$key = isset($_GET['key']) ? $_GET['key'] : '';
if (!$key || !isset($allowed[$key])) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid key']);
  exit;
}

$filepath = $allowed[$key];
$dir = dirname($filepath);
if (!is_dir($dir)) {
  @mkdir($dir, 0777, true);
}

$method = $_SERVER['REQUEST_METHOD'];

// Provide default values if file missing or invalid
function default_for($key) {
  switch ($key) {
    case 'savingsProgress':
      return [
        'amount' => 0,
        'day' => 0,
        'isSet' => false,
        'dailyRate' => 0.05
      ];
    case 'calcHistory':
      return [];
    case 'themeVars':
      return new stdClass();
    default:
      return new stdClass();
  }
}

if ($method === 'GET') {
  if (!file_exists($filepath)) {
    echo json_encode(default_for($key));
    exit;
  }
  $raw = @file_get_contents($filepath);
  if ($raw === false || trim($raw) === '') {
    echo json_encode(default_for($key));
    exit;
  }
  // Validate JSON
  $data = json_decode($raw, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(default_for($key));
    exit;
  }
  echo json_encode($data);
  exit;
}

if ($method === 'POST') {
  $raw = file_get_contents('php://input');
  if ($raw === false) {
    http_response_code(400);
    echo json_encode(['error' => 'No input']);
    exit;
  }
  $data = json_decode($raw, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
  }
  // Write pretty JSON
  $ok = @file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
  if ($ok === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write file']);
    exit;
  }
  echo json_encode(['ok' => true]);
  exit;
}

http_response_code(405);
header('Allow: GET, POST');
echo json_encode(['error' => 'Method not allowed']);
