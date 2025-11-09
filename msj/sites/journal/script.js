// DOM Elements
const calendarEl = document.getElementById('calendar');
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');
const todayBtn = document.getElementById('today-btn');
const tradeModal = document.getElementById('trade-modal');
const closeModalBtn = document.getElementById('close-modal');
const addTradeForm = document.getElementById('add-trade-form');
const tradesListEl = document.getElementById('trades-list');
const modalDateEl = document.getElementById('modal-date');
const addTradeModal = document.getElementById('add-trade-modal');
const openAddTradeBtn = document.getElementById('open-add-trade');
const closeAddTradeBtn = document.getElementById('close-add-trade');

// Current date
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

// Trade storage
let trades = {};

// Load trades from localStorage
function loadTrades() {
  const storedTrades = localStorage.getItem('tradingJournalTrades');
  if (storedTrades) {
    trades = JSON.parse(storedTrades);
  }
}

// Save trades to localStorage
function saveTrades() {
  localStorage.setItem('tradingJournalTrades', JSON.stringify(trades));
}

// Get date key for storage
function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date for display
function formatDateDisplay(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Generate calendar for selected month and year
function generateCalendar(month, year) {
  calendarEl.innerHTML = '';

  // Create month section
  const monthSection = document.createElement('div');
  monthSection.className = 'month-section';

  // Create month header
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthHeader = document.createElement('h3');
  monthHeader.className = 'month-header';
  monthHeader.textContent = `${monthNames[month]} ${year}`;
  monthSection.appendChild(monthHeader);

  // Create month grid
  const monthGrid = document.createElement('div');
  monthGrid.className = 'month-grid';

  // Add day headers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(dayName => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = dayName;
    monthGrid.appendChild(dayHeader);
  });

  // Get first day of the month and total days in month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Get previous month's last days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = startingDayOfWeek;

  // Add empty cells for days from previous month
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = prevMonthLastDay - i;
    dayEl.appendChild(dayNumber);
    monthGrid.appendChild(dayEl);
  }

  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Add calendar days for current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';

    const dayDate = new Date(year, month, day);
    dayDate.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(dayDate);

    // Check if this day has trades
    if (trades[dateKey] && trades[dateKey].length > 0) {
      dayEl.classList.add('has-trades');
    }

    // Check if this is today
    if (dayDate.getTime() === today.getTime()) {
      dayEl.classList.add('today');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;

    dayEl.appendChild(dayNumber);
    
    // Add click event to open modal
    dayEl.addEventListener('click', () => openTradeModal(dayDate));
    
    monthGrid.appendChild(dayEl);
  }

  // Add days from next month to fill the grid
  const totalCells = monthGrid.children.length - 7; // Subtract day headers
  const remainingCells = 42 - totalCells - 7; // 6 rows * 7 days - headers
  
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);
    monthGrid.appendChild(dayEl);
  }

  monthSection.appendChild(monthGrid);
  calendarEl.appendChild(monthSection);
}

// Open trade modal for a specific date
function openTradeModal(date) {
  selectedDate = date;
  const dateKey = getDateKey(date);
  
  // Update modal title
  modalDateEl.textContent = formatDateDisplay(date);
  
  // Display trades for this date
  displayTrades(dateKey);
  
  // Show modal
  tradeModal.style.display = 'flex';
}

// Close trade modal
function closeTradeModal() {
  tradeModal.style.display = 'none';
  selectedDate = null;
}

// Open add trade popup
function openAddTradePopup() {
  if (!selectedDate) {
    alert('Please select a date first by clicking on a calendar day.');
    return;
  }
  addTradeModal.style.display = 'flex';
}

// Close add trade popup
function closeAddTradePopup() {
  addTradeModal.style.display = 'none';
  addTradeForm.reset();
}

// Display trades for a specific date
function displayTrades(dateKey) {
  const dateTrades = trades[dateKey] || [];
  
  // Calculate statistics
  let totalTrades = dateTrades.length;
  let totalProfit = 0;
  let totalLoss = 0;
  
  dateTrades.forEach(trade => {
    const pl = trade.profitLoss;
    if (pl > 0) {
      totalProfit += pl;
    } else {
      totalLoss += Math.abs(pl);
    }
  });
  
  const netPL = totalProfit - totalLoss;
  
  // Update statistics
  document.getElementById('total-trades').textContent = totalTrades;
  document.getElementById('total-profit').textContent = `$${totalProfit.toFixed(2)}`;
  document.getElementById('total-loss').textContent = `$${totalLoss.toFixed(2)}`;
  document.getElementById('net-pl').textContent = `$${netPL.toFixed(2)}`;
  document.getElementById('net-pl').style.color = netPL >= 0 ? 'var(--success-color)' : '#f87171';
  
  // Display trade list
  if (dateTrades.length === 0) {
    tradesListEl.innerHTML = '<div class="no-trades">No trades recorded for this date</div>';
  } else {
    tradesListEl.innerHTML = '';
    dateTrades.forEach((trade, index) => {
      const tradeEl = createTradeElement(trade, index, dateKey);
      tradesListEl.appendChild(tradeEl);
    });
  }
}

// Create trade element
function createTradeElement(trade, index, dateKey) {
  const tradeDiv = document.createElement('div');
  tradeDiv.className = `trade-item ${trade.profitLoss >= 0 ? 'profit' : 'loss'}`;
  
  tradeDiv.innerHTML = `
    <div class="trade-info">
      <div class="trade-header">
        <div class="trade-symbol">${trade.symbol}</div>
        <div class="trade-type">${trade.type}</div>
      </div>
      <div class="trade-details">
        <div class="trade-detail-item">
          <div class="trade-detail-label">Entry</div>
          <div class="trade-detail-value">$${trade.entry.toFixed(2)}</div>
        </div>
        <div class="trade-detail-item">
          <div class="trade-detail-label">Exit</div>
          <div class="trade-detail-value">$${trade.exit.toFixed(2)}</div>
        </div>
        <div class="trade-detail-item">
          <div class="trade-detail-label">Lots Size</div>
          <div class="trade-detail-value">${trade.quantity}</div>
        </div>
      </div>
      <div class="trade-pl ${trade.profitLoss >= 0 ? 'profit' : 'loss'}">
        ${trade.profitLoss >= 0 ? '+' : ''}$${trade.profitLoss.toFixed(2)}
      </div>
      ${trade.notes ? `<div class="trade-notes">${trade.notes}</div>` : ''}
    </div>
    <div class="trade-actions">
      <button class="btn-delete" onclick="deleteTrade('${dateKey}', ${index})">Delete</button>
    </div>
  `;
  
  return tradeDiv;
}

// Add new trade
function addTrade(e) {
  e.preventDefault();
  
  if (!selectedDate) return;
  
  const dateKey = getDateKey(selectedDate);
  const symbol = document.getElementById('trade-symbol').value.toUpperCase();
  const type = document.getElementById('trade-type').value;
  const entry = parseFloat(document.getElementById('trade-entry').value);
  const exit = parseFloat(document.getElementById('trade-exit').value);
  const quantity = parseInt(document.getElementById('trade-quantity').value);
  const notes = document.getElementById('trade-notes').value;
  
  // Calculate profit/loss
  let profitLoss;
  if (type === 'Long') {
    profitLoss = (exit - entry) * quantity;
  } else {
    profitLoss = (entry - exit) * quantity;
  }
  
  const trade = {
    symbol,
    type,
    entry,
    exit,
    quantity,
    profitLoss,
    notes,
    timestamp: new Date().toISOString()
  };
  
  // Add trade to storage
  if (!trades[dateKey]) {
    trades[dateKey] = [];
  }
  trades[dateKey].push(trade);
  
  // Save and refresh
  saveTrades();
  displayTrades(dateKey);
  addTradeForm.reset();
  generateCalendar(currentMonth, currentYear);
  closeAddTradePopup();
}

// Delete trade
function deleteTrade(dateKey, index) {
  if (confirm('Are you sure you want to delete this trade?')) {
    trades[dateKey].splice(index, 1);
    
    // Remove date key if no trades left
    if (trades[dateKey].length === 0) {
      delete trades[dateKey];
    }
    
    saveTrades();
    displayTrades(dateKey);
    generateCalendar(currentMonth, currentYear);
  }
}

// Make deleteTrade available globally
window.deleteTrade = deleteTrade;

// Update calendar when month or year changes
function updateCalendar() {
  currentMonth = parseInt(monthSelect.value);
  currentYear = parseInt(yearSelect.value);
  generateCalendar(currentMonth, currentYear);
}

// Go to today's date
function goToToday() {
  const today = new Date();
  currentMonth = today.getMonth();
  currentYear = today.getFullYear();
  monthSelect.value = currentMonth;
  yearSelect.value = currentYear;
  generateCalendar(currentMonth, currentYear);
}

// Initialize the app
function init() {
  // Load trades from storage
  loadTrades();
  
  // Set current month and year in selectors
  monthSelect.value = currentMonth;
  yearSelect.value = currentYear;

  // Add event listeners
  monthSelect.addEventListener('change', updateCalendar);
  yearSelect.addEventListener('change', updateCalendar);
  todayBtn.addEventListener('click', goToToday);
  closeModalBtn.addEventListener('click', closeTradeModal);
  openAddTradeBtn.addEventListener('click', openAddTradePopup);
  closeAddTradeBtn.addEventListener('click', closeAddTradePopup);
  addTradeForm.addEventListener('submit', addTrade);
  
  // Close popup when clicking on overlay
  addTradeModal.querySelector('.popup-overlay').addEventListener('click', closeAddTradePopup);

  // Generate initial calendar
  generateCalendar(currentMonth, currentYear);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
