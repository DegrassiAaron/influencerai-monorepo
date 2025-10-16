import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

const render = (view: string, vars: Record<string, string | number | boolean> = {}) => {
  const layout = fs.readFileSync(path.join(__dirname, 'views', 'layout.html'), 'utf8');
  let body = fs.readFileSync(path.join(__dirname, 'views', `${view}.html`), 'utf8');
  for (const [k, v] of Object.entries(vars)) body = body.replaceAll(`{{${k}}}`, String(v));
  return layout.replace('{{body}}', body);
};

app.get('/healthz', (_req, res) => res.status(200).send('OK'));
app.get('/', (_req, res) => res.send(render('home', { title: 'Home' })));
app.get('/login', (_req, res) => res.send(render('login', { title: 'Login' })));
app.post('/login', (req, res) => {
  const { username, password } = req.body as any;
  if (username === 'demo' && password === 'demo') {
    res.redirect('/?login=success');
  } else {
    res.status(401).send(render('login', { title: 'Login', error: 'Invalid credentials' }));
  }
});

const port = Number(process.env.PORT || 5173);
app.listen(port, () => console.log(`[MCV] Test server listening on http://localhost:${port}`));
