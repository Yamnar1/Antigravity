// Mobile Sidebar Toggle Script
// Add this functionality to App

// Add toggleMobileSidebar method
if (typeof App !== 'undefined') {
    App.toggleMobileSidebar = function () {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar) {
            sidebar.classList.toggle('active');
        }
        if (overlay) {
            overlay.classList.toggle('active');
        }
    };

    // Close sidebar when clicking on nav links (mobile)
    const originalNavigate = App.navigate;
    App.navigate = function (page) {
        // Close mobile sidebar
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');

        // Call original navigate
        originalNavigate.call(this, page);
    };
}
