import "./globals.css";

export const metadata = {
  title: "Powerzone Fitness",
  description: "Gym Management System for Powerzone Fitness",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}