// Available websites (loaded dynamically)
let websites = [];
let websitesLoaded = false;

// Tab management
let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let navigationHistory = [];

// DOM Elements
const tabsContainer = document.getElementById('tabs-container');
const browserContent = document.getElementById('browser-content');
const newTabBtn = document.getElementById('new-tab-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const refreshBtn = document.getElementById('refresh-btn');
const homeBtn = document.getElementById('home-btn');
const circularNavContainer = document.getElementById('circular-nav-container');
const circularNav = document.getElementById('circular-nav');
const moveBtn = document.getElementById('move-btn');

// Create homepage HTML
function createHomepage() {
  // Show loading state if websites haven't loaded yet
  if (!websitesLoaded) {
    return `
      <div class="homepage">
        <h1 class="homepage-title">HELLO MSJ</h1>
        <p class="homepage-subtitle">Loading websites...</p>
      </div>
    `;
  }
  
  // Show message if no websites found
  if (websites.length === 0) {
    return `
      <div class="homepage">
        <h1 class="homepage-title">No Websites Found</h1>
        <p class="homepage-subtitle">Add website folders to the parent directory</p>
      </div>
    `;
  }
  
  const searchResults = websites.map(site => 
    `<div class="search-result-item" data-website="${site.name}">
      <div class="result-info">
        <div class="result-title">${site.title}</div>
        <div class="result-description">${site.description}</div>
      </div>
    </div>`
  ).join('');

  const websiteCards = websites.map(site =>
    `<div class="website-card" data-website="${site.name}">
      <div class="website-name">${site.title}</div>
      <div class="website-description">${site.description}</div>
    </div>`
  ).join('');

  return `
    <div class="homepage">
      <h1 class="homepage-title">HELLO MSJ</h1>
      
      <div class="search-container">
        <input 
          type="text" 
          class="search-input" 
          id="homepage-search" 
          placeholder="Search for websites..."
        >
        <div class="search-results" id="search-results">
          ${searchResults}
        </div>
      </div>

      <div class="websites-grid">
        ${websiteCards}
      </div>
    </div>
  `;
}

// Create a new tab
function createTab(title = 'New Tab', url = 'home') {
  const tabId = `tab-${tabCounter++}`;
  
  const tab = {
    id: tabId,
    title: title,
    url: url,
    history: ['home'],
    historyIndex: 0
  };
  
  tabs.push(tab);
  renderTabs();
  switchToTab(tabId);
  
  return tabId;
}

// Render tabs
function renderTabs() {
  tabsContainer.innerHTML = tabs.map(tab => `
    <div class="tab ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
      <span class="tab-title">${tab.title}</span>
      <button class="tab-close" data-tab-id="${tab.id}">×</button>
    </div>
  `).join('');
  
  // Add event listeners
  document.querySelectorAll('.tab').forEach(tabEl => {
    tabEl.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        const tabId = tabEl.dataset.tabId;
        switchToTab(tabId);
      }
    });
  });
  
  document.querySelectorAll('.tab-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabId = btn.dataset.tabId;
      closeTab(tabId);
    });
  });
}

// Switch to tab
function switchToTab(tabId) {
  activeTabId = tabId;
  const tab = tabs.find(t => t.id === tabId);
  
  if (!tab) return;
  
  // Update active states
  renderTabs();
  renderContent();
}

// Render content
function renderContent() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;
  
  browserContent.innerHTML = '';
  
  if (tab.url === 'home') {
    browserContent.innerHTML = createHomepage();
    setupHomepageListeners();
  } else {
    const website = websites.find(w => w.name === tab.url);
    if (website) {
      browserContent.innerHTML = `
        <div class="content-frame active">
          <iframe src="${website.path}" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
        </div>
      `;
    } else {
      browserContent.innerHTML = `
        <div class="homepage">
          <h1 class="homepage-title">Page Not Found</h1>
          <p class="homepage-subtitle">The website "${tab.url}" could not be found.</p>
        </div>
      `;
    }
  }
}

// Setup homepage event listeners
function setupHomepageListeners() {
  const searchInput = document.getElementById('homepage-search');
  const searchResults = document.getElementById('search-results');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      if (query.length > 0) {
        searchResults.classList.add('show');
        
        // Filter results
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
          const website = item.dataset.website;
          const site = websites.find(w => w.name === website);
          
          if (site.name.toLowerCase().includes(query) || 
              site.title.toLowerCase().includes(query) ||
              site.description.toLowerCase().includes(query)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      } else {
        searchResults.classList.remove('show');
      }
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = e.target.value.toLowerCase().trim();
        const site = websites.find(w => 
          w.name.toLowerCase().includes(query) || 
          w.title.toLowerCase().includes(query)
        );
        
        if (site) {
          openWebsite(site.name);
        }
      }
    });
  }
  
  // Website card clicks
  document.querySelectorAll('.website-card').forEach(card => {
    card.addEventListener('click', () => {
      const websiteName = card.dataset.website;
      openWebsite(websiteName);
    });
  });
  
  // Search result clicks
  document.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const websiteName = item.dataset.website;
      openWebsite(websiteName);
    });
  });
}

// Open website
function openWebsite(websiteName) {
  const website = websites.find(w => w.name === websiteName);
  if (!website) return;
  
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) {
    // Add to history
    if (tab.historyIndex < tab.history.length - 1) {
      // Remove forward history if navigating from middle
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
    }
    tab.history.push(website.name);
    tab.historyIndex = tab.history.length - 1;
    
    tab.title = website.title;
    tab.url = website.name;
    renderTabs();
    renderContent();
  }
}

// Close tab
function closeTab(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;
  
  tabs.splice(index, 1);
  
  if (tabs.length === 0) {
    createTab();
  } else if (activeTabId === tabId) {
    const newActiveIndex = Math.min(index, tabs.length - 1);
    switchToTab(tabs[newActiveIndex].id);
  } else {
    renderTabs();
  }
}

// Navigation functions
function goBack() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab && tab.historyIndex > 0) {
    tab.historyIndex--;
    const previousUrl = tab.history[tab.historyIndex];
    
    if (previousUrl === 'home') {
      tab.url = 'home';
      tab.title = 'New Tab';
    } else {
      const website = websites.find(w => w.name === previousUrl);
      if (website) {
        tab.url = website.name;
        tab.title = website.title;
      }
    }
    
    renderTabs();
    renderContent();
  }
}

function goForward() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab && tab.historyIndex < tab.history.length - 1) {
    tab.historyIndex++;
    const nextUrl = tab.history[tab.historyIndex];
    
    if (nextUrl === 'home') {
      tab.url = 'home';
      tab.title = 'New Tab';
    } else {
      const website = websites.find(w => w.name === nextUrl);
      if (website) {
        tab.url = website.name;
        tab.title = website.title;
      }
    }
    
    renderTabs();
    renderContent();
  }
}

function refresh() {
  renderContent();
}

function goHome() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab && tab.url !== 'home') {
    // Add to history
    if (tab.historyIndex < tab.history.length - 1) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
    }
    tab.history.push('home');
    tab.historyIndex = tab.history.length - 1;
    
    tab.url = 'home';
    tab.title = 'New Tab';
    renderTabs();
    renderContent();
  }
}


// Drag functionality for circular navigation
let isDragging = false;
let currentX = 0;
let currentY = 0;
let initialX = 0;
let initialY = 0;
let xOffset = 0;
let yOffset = 0;

// Load saved position from localStorage
function loadNavPosition() {
  const savedPosition = localStorage.getItem('circularNavPosition');
  if (savedPosition) {
    try {
      const position = JSON.parse(savedPosition);
      xOffset = position.x || 0;
      yOffset = position.y || 0;
      currentX = xOffset;
      currentY = yOffset;
      initialX = xOffset;
      initialY = yOffset;
      setTranslate(xOffset, yOffset, circularNavContainer);
      console.log('✅ Loaded navigation position:', position);
    } catch (error) {
      console.error('Error loading position:', error);
    }
  }
}

// Save position to localStorage
function saveNavPosition() {
  const position = {
    x: xOffset,
    y: yOffset
  };
  localStorage.setItem('circularNavPosition', JSON.stringify(position));
}

function dragStart(e) {
  if (e.type === "touchstart") {
    initialX = e.touches[0].clientX - xOffset;
    initialY = e.touches[0].clientY - yOffset;
  } else {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
  }

  if (e.target === moveBtn || e.target.closest('.move-btn')) {
    isDragging = true;
    circularNav.classList.add('dragging');
  }
}

function dragEnd(e) {
  if (isDragging) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    circularNav.classList.remove('dragging');
    
    // Save position when drag ends
    saveNavPosition();
    console.log('💾 Saved navigation position:', { x: xOffset, y: yOffset });
  }
}

function drag(e) {
  if (isDragging) {
    e.preventDefault();
    
    if (e.type === "touchmove") {
      currentX = e.touches[0].clientX - initialX;
      currentY = e.touches[0].clientY - initialY;
    } else {
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
    }

    xOffset = currentX;
    yOffset = currentY;

    setTranslate(currentX, currentY, circularNavContainer);
  }
}

function setTranslate(xPos, yPos, el) {
  el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

// Add drag event listeners
circularNav.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

// Touch events for mobile
circularNav.addEventListener('touchstart', dragStart);
document.addEventListener('touchmove', drag);
document.addEventListener('touchend', dragEnd);

// Event listeners
newTabBtn.addEventListener('click', () => createTab());
backBtn.addEventListener('click', goBack);
forwardBtn.addEventListener('click', goForward);
refreshBtn.addEventListener('click', refresh);
homeBtn.addEventListener('click', goHome);

// Load websites from server
async function loadWebsites() {
  try {
    const response = await fetch('get-websites.php');
    const data = await response.json();
    
    if (data.success) {
      websites = data.websites;
      websitesLoaded = true;
      
      // Refresh current tab if it's showing homepage
      if (activeTabId) {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab && tab.url === 'home') {
          renderContent();
        }
      }
      
      console.log(`✅ Loaded ${data.count} websites automatically`);
    }
  } catch (error) {
    console.error('Failed to load websites:', error);
    // Fallback to empty array
    websites = [];
    websitesLoaded = true;
  }
}

// Auto-refresh websites list every 30 seconds to detect new websites
function startAutoRefresh() {
  setInterval(() => {
    loadWebsites();
  }, 30000); // 30 seconds
}

// Load saved navigation position immediately
loadNavPosition();

// Initialize
loadWebsites().then(() => {
  createTab();
  startAutoRefresh();
});
