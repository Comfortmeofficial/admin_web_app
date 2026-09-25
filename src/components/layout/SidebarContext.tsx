import { createContext, useContext } from 'react';

// Lets a page's Header open the off-canvas sidebar on small screens without
// every page having to thread a prop down from AppLayout.
export const SidebarContext = createContext<{ openSidebar: () => void }>({ openSidebar: () => {} });

export const useSidebar = () => useContext(SidebarContext);
