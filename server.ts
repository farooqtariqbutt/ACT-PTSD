import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text } = req.body;
    try {
      const data = await resend.emails.send({
        from: 'bot@act-ptsd.com',
        to,
        subject,
        text,
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
