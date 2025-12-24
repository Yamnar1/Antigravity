// Mobile Table Labels Script
// Automatically adds data-label attributes to table cells for mobile card view

function addTableLabels() {
    // Wait for tables to be rendered
    setTimeout(() => {
        const tables = document.querySelectorAll('table');

        tables.forEach(table => {
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            const rows = table.querySelectorAll('tbody tr');

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells.forEach((cell, index) => {
                    if (headers[index]) {
                        cell.setAttribute('data-label', headers[index]);
                    }
                });
            });
        });
    }, 100);
}

// Run on page load and navigation
if (typeof App !== 'undefined') {
    const originalNavigate = App.navigate;
    App.navigate = function (page) {
        originalNavigate.call(this, page);
        addTableLabels();
    };
}

// Also run on window load
window.addEventListener('load', addTableLabels);

// And on DOM changes (for dynamic content)
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                addTableLabels();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
