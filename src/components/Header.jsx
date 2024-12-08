import React,{useState, useEffect} from 'react'

function Header({isExpanded,setIsExpanded}) {
    const [isMobile, setIsMobile] = useState(false); // State to track mobile screen size
  
     // Update isMobile state based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setIsExpanded(false); // Collapse sidebar on mobile by default
      } else {
        setIsMobile(false);
        setIsExpanded(true); // Expand sidebar on desktop by default
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize); // Listen for window resize

    return () => {
      window.removeEventListener('resize', handleResize); // Clean up listener
    };
  }, []);


  return (
    <div className='p-4 border-b  border-gray-600 bg-gray-800 h-20'>
        {/* Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4  hover:bg-gray-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h8m-8 6h16"
            />
          </svg>
        </button>
      )}

    </div>

  )
}

export default Header
