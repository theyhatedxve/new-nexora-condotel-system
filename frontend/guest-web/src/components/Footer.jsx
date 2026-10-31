const currentYear = new Date().getFullYear();

function Footer() {
  return (
    <footer className="footer">
      <p>© {currentYear} NEXORA. All rights reserved.</p>
    </footer>
  );
}

export default Footer;