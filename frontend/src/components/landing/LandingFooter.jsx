const styles = {
  footer: {
    background: '#0f172a',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '32px 20px',
    fontSize: '14px',
  },
};

export default function LandingFooter() {
  return (
    <footer style={styles.footer}>
      <p>Copyright {new Date().getFullYear()} StockPilot - Inventory Avengers. All rights reserved.</p>
    </footer>
  );
}
