import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-full">
      <main>{children}</main>
    </div>
  );
};

export default Layout;
