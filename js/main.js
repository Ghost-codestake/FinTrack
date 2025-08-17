// Expense Tracker Application
class ExpenseTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.currentFilter = {
            fromDate: '',
            toDate: '',
            category: 'all',
            type: 'all'
        };
        
        this.expenseChart = null;
        this.monthlyChart = null;
        
        this.init();
    }
    
    init() {
        this.setTodayDate();
        this.renderTransactions();
        this.updateDashboard();
        this.renderCharts();
        this.addEventListeners();
        this.checkDarkMode();
        this.setupCurrencyConverter();
    }
    
    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
    }
    
    addEventListeners() {
        // Form submission
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });
        
        // Filter buttons
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });
        
        // Filter change (live update)
        document.getElementById('filter-category').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-type').addEventListener('change', () => this.applyFilters());
        
        // Dark mode
        this.toggleDarkMode();
    }
    
    addTransaction() {
        const type = document.getElementById('transaction-type').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const description = document.getElementById('description').value || 'No description';
        
        const transaction = {
            id: Date.now(),
            type,
            amount,
            category,
            date,
            description
        };
        
        this.transactions.push(transaction);
        this.saveToLocalStorage();
        this.updateDashboard();
        this.renderTransactions();
        this.renderCharts();
        
        // Reset form
        document.getElementById('transaction-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }
    
    renderTransactions() {
        const filteredTransactions = this.getFilteredTransactions();
        const transactionsList = document.getElementById('transactions-list');
        
        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = '<p class="no-transactions">No transactions match your filters.</p>';
            return;
        }
        
        // Sort by date (newest first)
        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        transactionsList.innerHTML = filteredTransactions.map(transaction => `
            <div class="transaction-item transaction-${transaction.type}">
                <div class="transaction-left">
                    <div class="transaction-type">${transaction.type === 'income' ? 'Income' : 'Expense'}</div>
                    <div class="transaction-category">${this.getCategoryLabel(transaction.category)}</div>
                    <div class="transaction-description">${transaction.description}</div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount">${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}</div>
                    <div class="transaction-date">${this.formatDate(transaction.date)}</div>
                </div>
            </div>
        `).join('');
    }
    
    getCategoryLabel(category) {
        const labels = {
            'salary': 'Salary',
            'freelance': 'Freelance',
            'investment': 'Investment',
            'gift': 'Gift',
            'other-income': 'Other Income',
            'food': 'Food & Dining',
            'transport': 'Transport',
            'bills': 'Bills & Utilities',
            'entertainment': 'Entertainment',
            'shopping': 'Shopping',
            'health': 'Health & Fitness',
            'housing': 'Housing',
            'education': 'Education',
            'travel': 'Travel',
            'other-expense': 'Other Expense'
        };
        
        return labels[category] || category;
    }
    
    formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    updateDashboard() {
        const totalIncome = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpense;
        
        document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
        document.getElementById('total-expense').textContent = `$${totalExpense.toFixed(2)}`;
        document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
    }
    
    applyFilters() {
        this.currentFilter = {
            fromDate: document.getElementById('filter-date-from').value,
            toDate: document.getElementById('filter-date-to').value,
            category: document.getElementById('filter-category').value,
            type: document.getElementById('filter-type').value
        };
        
        this.renderTransactions();
        this.renderCharts();
    }
    
    resetFilters() {
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-type').value = 'all';
        
        this.currentFilter = {
            fromDate: '',
            toDate: '',
            category: 'all',
            type: 'all'
        };
        
        this.renderTransactions();
        this.renderCharts();
    }
    
    getFilteredTransactions() {
        return this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            
            // Filter by date range
            if (this.currentFilter.fromDate) {
                const fromDate = new Date(this.currentFilter.fromDate);
                if (transactionDate < fromDate) return false;
            }
            
            if (this.currentFilter.toDate) {
                const toDate = new Date(this.currentFilter.toDate);
                toDate.setHours(23, 59, 59, 999);
                if (transactionDate > toDate) return false;
            }
            
            // Filter by category
            if (this.currentFilter.category !== 'all' && transaction.category !== this.currentFilter.category) {
                return false;
            }
            
            // Filter by type
            if (this.currentFilter.type !== 'all' && transaction.type !== this.currentFilter.type) {
                return false;
            }
            
            return true;
        });
    }
    
    renderCharts() {
        this.renderExpenseChart();
        this.renderMonthlyChart();
    }
    
    renderExpenseChart() {
        const ctx = document.getElementById('expense-chart').getContext('2d');
        
        if (this.expenseChart) this.expenseChart.destroy();
        
        const filteredTransactions = this.getFilteredTransactions();
        const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
        
        const categoryTotals = {};
        expenseTransactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });
        
        const categories = Object.keys(categoryTotals);
        const amounts = Object.values(categoryTotals);
        
        const colors = [
            '#ef476f', '#06d6a0', '#ffd166', '#3498db', 
            '#9b59b6', '#e74c3c', '#2ecc71', '#f39c12', 
            '#1abc9c', '#34495e'
        ];
        
        this.expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories.map(cat => this.getCategoryLabel(cat)),
                datasets: [{
                    data: amounts,
                    backgroundColor: categories.map((_, i) => colors[i % colors.length]),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Expenses by Category',
                        font: { size: 16 }
                    },
                    legend: { position: 'right' }
                }
            }
        });
    }
    
    renderMonthlyChart() {
        const ctx = document.getElementById('monthly-chart').getContext('2d');
        
        if (this.monthlyChart) this.monthlyChart.destroy();
        
        const filteredTransactions = this.getFilteredTransactions();
        
        const monthlyData = {};
        filteredTransactions.forEach(t => {
            const monthYear = t.date.substring(0, 7);
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = { income: 0, expense: 0 };
            }
            monthlyData[monthYear][t.type] += t.amount;
        });
        
        const sortedMonths = Object.keys(monthlyData).sort();
        const incomeData = sortedMonths.map(month => monthlyData[month].income);
        const expenseData = sortedMonths.map(month => monthlyData[month].expense);
        
        const monthLabels = sortedMonths.map(month => {
            const date = new Date(month);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
        
        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: 'rgba(6, 214, 160, 0.7)',
                        borderColor: 'rgba(6, 214, 160, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: 'rgba(239, 71, 111, 0.7)',
                        borderColor: 'rgba(239, 71, 111, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses',
                        font: { size: 16 }
                    },
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount ($)' }
                    },
                    x: {
                        title: { display: true, text: 'Month' }
                    }
                }
            }
        });
    }
    
    // --------------------------
    // Dark Mode
    // --------------------------
    checkDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'enabled';
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.getElementById('dark-mode-toggle').checked = true;
            document.querySelector('.theme-toggle .icon').textContent = '☀️';
        }
    }
    
    toggleDarkMode() {
        const toggle = document.getElementById('dark-mode-toggle');
        const icon = document.querySelector('.theme-toggle .icon');
        
        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'enabled');
                icon.textContent = '☀️';
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'disabled');
                icon.textContent = '🌙';
            }
        });
    }
    
    // --------------------------
    // Currency Converter
    // --------------------------
    setupCurrencyConverter() {
        const convertBtn = document.getElementById('convert-btn');
        
        convertBtn.addEventListener('click', async () => {
            const fromAmount = document.getElementById('from-amount').value;
            const fromCurrency = document.getElementById('from-currency').value;
            const toCurrency = document.getElementById('to-currency').value;
            const resultElement = document.getElementById('converter-result');
            
            if (!fromAmount || isNaN(fromAmount) || fromAmount <= 0) {
                resultElement.textContent = 'Please enter a valid amount.';
                return;
            }
            
            resultElement.textContent = 'Converting...';
            
            try {
                const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
                const data = await response.json();
                
                if (data.rates[toCurrency]) {
                    const rate = data.rates[toCurrency];
                    const convertedAmount = (fromAmount * rate).toFixed(2);
                    resultElement.innerHTML = `
                        <strong>${fromAmount} ${fromCurrency}</strong> = 
                        <strong>${convertedAmount} ${toCurrency}</strong>
                        (1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency})
                    `;
                } else {
                    resultElement.textContent = 'Conversion rate not available.';
                }
            } catch (error) {
                console.error('Currency conversion error:', error);
                resultElement.textContent = 'Failed to fetch exchange rates. Check your connection.';
            }
        });
    }
    
    // --------------------------
    // Data Persistence
    // --------------------------
    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new ExpenseTracker();
});