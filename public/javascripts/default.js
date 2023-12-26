
  // Get the current pathname
  const activePage = window.location.pathname;

  // Function to add 'active' class to the corresponding navigation item
  function setActivePage() {
    // Remove 'active' class from all navigation items
    document.querySelectorAll('.navbar-nav .nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add 'active' class to the corresponding navigation item based on the activePage
    const navItem = document.querySelector('.navbar-nav .nav-item' );
    if (navItem) {
      navItem.classList.add('active');
    }
  }

  // Call the function to set the initial active page
  setActivePage();
