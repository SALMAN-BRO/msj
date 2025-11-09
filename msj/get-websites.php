<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Get the sites directory inside msj folder
$websiteDir = __DIR__ . '/sites';

// Folders to exclude from the list
$excludeFolders = ['.', '..', '.git', 'node_modules', 'vendor'];

// Load custom website configurations if exists
$configFile = __DIR__ . '/websites-config.json';
$customConfig = [];
if (file_exists($configFile)) {
    $customConfig = json_decode(file_get_contents($configFile), true) ?? [];
}

$websites = [];

// Scan the website directory
if (is_dir($websiteDir)) {
    $items = scandir($websiteDir);
    
    foreach ($items as $item) {
        // Skip excluded folders and files
        if (in_array($item, $excludeFolders) || !is_dir($websiteDir . '/' . $item)) {
            continue;
        }
        
        $folderPath = $websiteDir . '/' . $item;
        
        // Check if index.html or index.php exists
        $hasIndex = file_exists($folderPath . '/index.html') || 
                    file_exists($folderPath . '/index.php');
        
        if ($hasIndex) {
            // Check if custom config exists for this website
            if (isset($customConfig[$item])) {
                $config = $customConfig[$item];
                $websites[] = [
                    'name' => $item,
                    'title' => $config['title'] ?? ucfirst($item),
                    'description' => $config['description'] ?? 'Web application',
                    'path' => 'sites/' . $item . '/index.html',
                    'category' => $config['category'] ?? 'general'
                ];
            } else {
                // Auto-generate website info
                // Try to guess description based on folder name
                $description = 'Web application';
                if (strpos($item, 'admin') !== false) $description = 'Administration panel';
                elseif (strpos($item, 'shop') !== false) $description = 'Online shopping';
                elseif (strpos($item, 'blog') !== false) $description = 'Blog and articles';
                elseif (strpos($item, 'dashboard') !== false) $description = 'Analytics dashboard';
                
                $websites[] = [
                    'name' => $item,
                    'title' => ucfirst(str_replace(['-', '_'], ' ', $item)),
                    'description' => $description,
                    'path' => 'sites/' . $item . '/index.html',
                    'category' => 'general'
                ];
            }
        }
    }
}

// Sort websites alphabetically by title
usort($websites, function($a, $b) {
    return strcmp($a['title'], $b['title']);
});

echo json_encode([
    'success' => true,
    'websites' => $websites,
    'count' => count($websites)
]);
?>
