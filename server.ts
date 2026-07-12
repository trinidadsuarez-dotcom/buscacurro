/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, categorizeIntoNiche } from "./server/db.ts";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Job } from "./src/types.ts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is missing.");
}

// ==========================================
// API ROUTES
// ==========================================

// Health checks for Easypanel or general container orchestration
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth Login / Registration
app.post("/api/auth/login", (req, res) => {
  const { email, name, role, location, industry } = req.body;
  if (!email) {
    return res.status(400).json({ error: "El correo electrónico es requerido." });
  }

  let user = db.getUserByEmail(email);

  if (!user) {
    // Register new user
    const newUser = {
      id: `user-${Date.now()}`,
      name: name || email.split('@')[0],
      email,
      role: role || 'candidate',
      isVerified: false,
      location: location || 'Madrid, España',
      industry: industry || 'Tecnología',
      cvText: role === 'candidate' ? 'Por favor escribe o pega tu currículum aquí.' : undefined
    };
    user = db.addUser(newUser);

    // Welcome notification
    db.addNotification({
      id: `notif-${Date.now()}`,
      userId: user.id,
      message: `¡Bienvenido a TrabajoLocal, ${user.name}! Comienza completando tu perfil para verificarlo.`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  res.json(user);
});

// Get User Profile
app.get("/api/user/:id", (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json(user);
});

// Update User Profile
app.put("/api/user/:id", (req, res) => {
  const user = db.updateUser(req.params.id, req.body);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json(user);
});

// Verify User Profile (Simulated Verification Badge)
app.post("/api/user/:id/verify", (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

  const updatedUser = db.updateUser(req.params.id, {
    isVerified: true,
    verifiedAt: new Date().toISOString()
  });

  // Create real-time notification
  const notificationId = `notif-${Date.now()}`;
  db.addNotification({
    id: notificationId,
    userId: req.params.id,
    message: `🎖️ ¡Felicidades! Tu perfil ha sido verificado como perfil auténtico. Ahora tienes el sello de confianza de la plataforma.`,
    type: 'success',
    read: false,
    createdAt: new Date().toISOString(),
    emailSentTo: user.email // Simulated email notification trigger
  });

  res.json(updatedUser);
});

// Get all Job postings with filters
app.get("/api/jobs", (req, res) => {
  const { industry, location, type, salaryMin } = req.query;
  let jobs = db.getJobs();

  // Enforce the strict niche filter so the user only sees relevant jobs
  jobs = jobs.filter(j => isJobMatchingNiche(j.title, j.description, j.industry));

  if (industry && industry !== 'Todas') {
    jobs = jobs.filter(j => j.industry === industry);
  }

  if (location && typeof location === 'string') {
    const locClean = location.trim().toLowerCase();
    if (locClean !== '') {
      jobs = jobs.filter(j => 
        j.location.toLowerCase().includes(locClean) || 
        locClean.includes(j.location.toLowerCase())
      );
    }
  }

  if (type && type !== 'Todos') {
    jobs = jobs.filter(j => j.type === type);
  }

  if (salaryMin) {
    const minVal = parseInt(salaryMin as string, 10);
    if (!isNaN(minVal)) {
      jobs = jobs.filter(j => j.salaryMax >= minVal);
    }
  }

  res.json(jobs);
});

// Get specific Job posting
app.get("/api/jobs/:id", (req, res) => {
  const job = db.getJobById(req.params.id);
  if (!job) return res.status(404).json({ error: "Oferta de trabajo no encontrada." });
  res.json(job);
});

// Post a new Job posting (recruiter only)
app.post("/api/jobs", (req, res) => {
  const { title, company, description, location, type, salaryMin, salaryMax, industry, recruiterId } = req.body;
  
  if (!title || !company || !description || !location || !recruiterId) {
    return res.status(400).json({ error: "Campos requeridos faltantes." });
  }

  const recruiter = db.getUserById(recruiterId);
  const isVerifiedCompany = recruiter ? recruiter.isVerified : false;

  const newJob = {
    id: `job-${Date.now()}`,
    title,
    company,
    description,
    location,
    type: type || 'local',
    salaryMin: Number(salaryMin) || 0,
    salaryMax: Number(salaryMax) || 0,
    industry: industry || 'Tecnología',
    recruiterId,
    postedAt: new Date().toISOString(),
    isVerifiedCompany
  };

  const savedJob = db.addJob(newJob);
  res.status(201).json(savedJob);
});

// Helper to fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Helper to strip HTML tags and tidy text
function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Preprocess URLs (e.g. to convert Google Search Jobs URLs to Google News RSS feeds)
function preprocessUrl(url: string): string {
  try {
    const trimmed = url.trim();
    if (trimmed.includes("google.com/search") || trimmed.includes("google.es/search") || trimmed.includes("google.cl/search") || trimmed.includes("google.com.mx/search") || trimmed.includes("google.com.ar/search")) {
      const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const q = urlObj.searchParams.get("q");
      if (q) {
        const queryTerm = q.trim();
        let finalQuery = queryTerm;
        if (!queryTerm.toLowerCase().includes("empleo") && !queryTerm.toLowerCase().includes("trabajo") && !queryTerm.toLowerCase().includes("vacante")) {
          finalQuery = `${queryTerm} empleo OR vacante OR trabajo`;
        }
        return `https://news.google.com/rss/search?q=${encodeURIComponent(finalQuery)}&hl=es&gl=ES&ceid=ES:es`;
      }
    }
    return trimmed;
  } catch (err) {
    return url;
  }
}

// Check if a job posting matches the strict allowed categories:
// Marketing Digital, Redacción Web, Social Media Manager, Community Manager, Producción Audiovisual, Producción de Animación
function isJobMatchingNiche(title: string, description: string, industry: string): boolean {
  const combined = `${title} ${description} ${industry}`.toLowerCase();
  
  // Normalize accents/diacritics
  const clean = combined
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const targetKeywords = [
    "marketing digital",
    "marketing online",
    "redaccion web",
    "redaccion",
    "redactor",
    "copywriter",
    "copywriting",
    "redaccion de contenidos",
    "social media manager",
    "social media",
    "community manager",
    "produccion audiovisual",
    "audiovisual",
    "editor de video",
    "edicion de video",
    "produccion de animacion",
    "animacion",
    "animador",
    "motion graphics",
    "creador de contenido",
    "seo",
    "sem"
  ];

  return targetKeywords.some(keyword => clean.includes(keyword));
}

// Ensure the RSS item represents an actual job vacancy offer and not generic news/articles/tutorials/events
function isActualJobOffer(title: string, description: string, isExternalImport: boolean = true): boolean {
  if (!isExternalImport) {
    // Trusted manually created jobs
    return true;
  }

  const combined = `${title} ${description}`.toLowerCase();
  
  // Normalize accents/diacritics
  const clean = combined
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  const cleanTitle = title.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. Check Spanish language requirement:
  const spanishStopwords = [" de ", " la ", " el ", " en ", " para ", " que ", " con ", " los ", " las ", " por ", " del ", " una ", " como "];
  let spanishWordMatches = 0;
  for (const word of spanishStopwords) {
    const regex = new RegExp(word, 'g');
    const matches = combined.match(regex);
    if (matches) {
      spanishWordMatches += matches.length;
    }
  }
  // Require at least 3 occurrences of Spanish words to be considered Spanish.
  if (spanishWordMatches < 3) {
    return false;
  }

  // 2. Spain Focus & Anti-Latin-America requirement:
  const latinAmericaKeywords = [
    "mexico", "colombia", "argentina", "chile", "peru", "ecuador", "venezuela", "uruguay", "paraguay", 
    "bolivia", "guatemala", "costa rica", "republica dominicana", "panama", "honduras", "salvador", "nicaragua",
    "bogota", "buenos aires", "santiago de chile", "lima", "quito", "caracas", "montevideo", "asuncion", "la paz",
    "latam", "latinoamerica", "pesos", "soles", "mexicano", "colombiano", "argentino", "chileno", "peruano"
  ];
  if (latinAmericaKeywords.some(keyword => cleanTitle.includes(keyword) || clean.includes(keyword))) {
    return false;
  }

  // 3. Regular Expression checks for typical News Headings (e.g. "Las 10 mejores...", "5 claves...")
  const listRegex = /(los|las|\b\d+)\s+(\d+\s+)?(mejores|claves|trucos|consejos|errores|herramientas|agencias|pasos|beneficios|ventajas|razones|recursos|tendencias|mitos)\b/i;
  if (listRegex.test(cleanTitle)) {
    return false;
  }

  // 4. Commemorative / Informational / Trend Days Exclusions
  const commemorativeKeywords = [
    "dia del", "dia mundial", "dia internacional", "dia de la", "dia de los", "celebra", "celebracion", "efemerides"
  ];
  if (commemorativeKeywords.some(kw => cleanTitle.includes(kw))) {
    return false;
  }

  // 5. Educational / Academic syllabus / Lecture Exclusions
  const educationalKeywords = [
    "clase n", "clase numero", "catedra", "grado en", "master en", "curso de", "cursos de", "taller de", "talleres de",
    "formacion en", "facultad de", "universidad de", "colegio de", "instituto de", "temario", "introduccion al", "introduccion a la",
    "fundamentos de", "aprende a", "aprender a", "becas de", "becas para"
  ];
  if (educationalKeywords.some(kw => cleanTitle.includes(kw) || clean.includes(kw))) {
    return false;
  }

  // 6. Public Sector / Civil Servant Exams Exclusions (Not active private sector vacancies)
  const publicSectorKeywords = [
    "proceso selectivo", "lista de reserva", "lista reserva", "oposicion", "oposiciones", "concurso oposicion",
    "ayuntamiento", "diputacion", "cabildo", "generalitat", "junta de", "boletin oficial", "boe", "bop", "dogc",
    "bopa", "boc", "boja", "convocatoria", "convocatorias", "plazas de", "empleo publico", "funcionarios", "funcionario",
    "subvencion", "subvenciones", "tecnico superior", "tecnico medio", "tecnico especialista", "tecnico/a superior",
    "tecnico/a medio", "concurso de meritos", "meritos", "concurso-oposicion", "concurso oposicion", "consorcio",
    "cccb", "centre de cultura", "patronato"
  ];
  if (publicSectorKeywords.some(kw => cleanTitle.includes(kw) || clean.includes(kw))) {
    return false;
  }

  // 7. Journalism Headline Verb & Story Exclusions
  const storyVerbs = [
    "se despide", "fallece", "muere", "muerte de", "obituario", "se pronuncia", "se va de", "carga contra", "critica",
    "abandona", "apuesta por", "apuestan por", "aposto por", "crea su", "crean su", "creo su", "crearon su", "abre su", "abren su", "abrio su", "se asocia", "alianza",
    "inversion", "invierte", "adquiere", "compra", "vende", "inaugura", "inauguran", "acoge", "acogen", "refuerza", "refuerzan",
    "lidera", "lideran", "revela", "sube", "baja", "cae", "entrevista a", "entrevista con", "conversamos con", "hablamos con",
    "retrato de", "historia de", "historia del", "perfil de", "conoce a", "conoce el", "conoce la", "conoce los", "el futuro de",
    "el impacto de", "el auge de", "el auge del", "digitalizacion de", "digitalizacion en", "analisis sobre", "analisis de",
    "opinion sobre", "opinion de", "reflexion sobre", "equipa", "equipan", "lanzo", "lanzaron", "compro", "vendio", "fallecio",
    "murio", "despidio", "incorporo", "retira", "se retira", "jubila", "se jubila"
  ];
  if (storyVerbs.some(verb => cleanTitle.includes(verb) || clean.includes(verb))) {
    return false;
  }

  // 8. General News Reporting Verbs / Headline Indicators
  const newsVerbs = [
    "busca", "buscan", "buscamos", "contrata", "contratan", "contratamos", "anuncia", "anuncian", 
    "ofrece", "ofrecen", "ofrecemos", "presenta", "presentan", "lanza", "lanzan", "necesita", "necesitan", 
    "precisa", "precisan", "solicita", "solicitan", "se busca", "se buscan", "se contrata", "se contratan", 
    "se necesita", "se necesitan", "se ofrece", "se ofrecen", "se solicita", "se solicitan"
  ];
  
  if (cleanTitle.includes(":") && !cleanTitle.startsWith("trabajo") && !cleanTitle.startsWith("oferta")) {
    return false;
  }

  // If title has a verb like "busca" or "contrata" preceded by proper nouns (like "Google", "MGS Seguros", "Ayuntamiento", etc.), it's a news report.
  for (const verb of ["busca", "buscan", "contrata", "contratan", "ofrece", "ofrecen", "lanza", "lanzan", "refuerza", "refuerzan"]) {
    const regex = new RegExp(`.+?\\b${verb}\\b`, 'i');
    if (regex.test(title)) {
      if (!title.toLowerCase().startsWith("buscamos") && !title.toLowerCase().startsWith("se busca")) {
        return false;
      }
    }
  }

  // 9. Negative word list for title & description
  const negativeNewsKeywords = [
    "como hacer", "como mejorar", "como crear", "como usar", "como ser", "como conseguir", "como trabajar",
    "como utilizar", "como optimizar", "como redactar", "como planificar", "como diseñar",
    "consejos para", "consejos de", "claves para", "trucos para", "guia de", "guia para",
    "tendencias de", "tendencias en", "por que es", "que es un", "que es una", "que es el", "que es la",
    "los mejores", "las mejores", "asi es", "de esta manera", "todo lo que necesitas saber", "guia completa", "guia definitiva", 
    "consejos sobre", "claves del", "claves de la", "errores comunes", "errores al", "aprende a",
    "aprende como", "guia practica", "los beneficios de", "las ventajas de", "por que deberias", "el exito de",
    "la importancia de", "entrevista a", "entrevista con", "noticias", "noticia", "revoluciona", "las claves", 
    "el mercado de", "empleo crece", "trabajo crece", "asi influye", "como influye", "conoce a", "conoce el", "conoce la", "conoce los",
    "¿como", "como redactar un", "claves para redactar", "consejos para redactores", "aprender redactar",
    "herramientas para", "herramientas de", "el secreto", "mitos de", "mitos sobre", "paso a paso", "webinar",
    "masterclass", "taller de", "seminario", "conferencia", "podcast", "novedades", "opinion sobre", "analisis de",
    "analisis sobre", "reflexion sobre", "desafios de", "retos de", "digitalizacion de", "estrategias para",
    "consejo", "truco", "error que", "los errores", "pasos para", "para mejorar", "para optimizar", "triunfar en",
    "como ", "que es ", "que son ", "por que ",
    "empleos mas demandados", "empleos para", "trabajos para", "oportunidades de empleo", "oportunidades de trabajo", 
    "boletin", "diario oficial", "gaceta", "periodico", "el pais", "el mundo", "la vanguardia", "lectura", "semana", "mes", "año", 
    "hoy", "ayer", "segun", "informa", "anuncia", "publica", "analiza", "destaca", "revela", "alerta", "advierte", "descubre", 
    "conoce las", "apuntate a", "asi puedes", "como apuntarse", "como inscribirse", "requisitos para acceder", "como acceder", 
    "como trabajar en", "como conseguir empleo en", "donde encontrar", "las mejores empresas para", "empresas que buscan", 
    "busca personal", "busca trabajadores", "necesita incorporar", "oferta de empleo para", "ofertas de empleo en", "puestos vacantes",
    "se busca personal", "abre bolsa", "abre plazo", "plazo de inscripcion", "bolsa de trabajo de", "oposiciones a",
    "20minutos", "redaccion medica", "periodismo", "laboratorio de periodismo", "el nuevo rol", "rol del", "roles del",
    "en la era", "era de", "la era de", "inteligencia artificial", "ia en", "ia para", "un importante animador", "un animador de",
    "famoso animador", "famoso redactor", "famoso community", "exito en", "claves en", "despide de"
  ];
  if (negativeNewsKeywords.some(keyword => cleanTitle.includes(keyword) || clean.includes(keyword))) {
    return false;
  }

  // 10. Positive job indicators requirement
  const jobIndicators = [
    "empleo", "vacante", "trabajo", "buscamos", "unete", "contrata", "hiring", "career",
    "oferta", "puesto", "incorporacion", "jornada", "sueldo", "salario", "remunerado", "remunerada",
    "contract", "salary", "full-time", "part-time", "remoto", "remota", "freelance",
    "apply", "postula", "seleccion", "perfil", "requisitos", "experiencia", "cv", "curriculum",
    "enviar", "inscribete", "inscribirse", "candidato", "candidata", "postulacion",
    "responsabilidades", "funciones", "ofrecemos", "contratacion", "bolsa de trabajo", 
    "se busca", "se solicita", "se precisa", "precisa incorporar", "urge", "contratamos",
    "analista", "especialista", "creador", "redactor", "copywriter", "editor", "animador", "manager",
    "director", "designer", "diseñador", "consultor", "tecnico", "experto", "profesional",
    "social media", "community manager", "copywriting", "audiovisual", "seo", "sem"
  ];

  const hasJobKeyword = jobIndicators.some(indicator => clean.includes(indicator));
  return hasJobKeyword;
}

// Fallback Helper to parse RSS XML manually without requiring Gemini API
function parseRssXmlManually(xmlText: string, feedUrl: string = ''): any[] {
  const jobs: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  const urlLower = feedUrl.toLowerCase();
  const isGoogleNews = urlLower.includes("news.google.com");
  const isRemoteOk = urlLower.includes("remoteok.com") || urlLower.includes("remoteok.io");
  const isJobicy = urlLower.includes("jobicy.com");
  const isWwr = urlLower.includes("weworkremotely.com");
  
  while ((match = itemRegex.exec(xmlText)) !== null && jobs.length < 15) {
    const content = match[1];
    
    // 1. Extract link/URL
    const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/i);
    let link = linkMatch ? linkMatch[1].trim() : "";
    link = link.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1')
               .replace(/<!\[CDATA\[/gi, '')
               .replace(/\]\]>/gi, '')
               .trim();

    // 2. Extract title
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
    let titleRaw = titleMatch ? titleMatch[1].trim() : "Oferta de Empleo";
    titleRaw = titleRaw.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1')
                       .replace(/<!\[CDATA\[/gi, '')
                       .replace(/\]\]>/gi, '')
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"')
                       .trim();
    
    // 3. Extract description
    let descRaw = "";
    const contentEncodedMatch = content.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
    if (contentEncodedMatch) {
      descRaw = contentEncodedMatch[1].trim();
    } else {
      const descMatch = content.match(/<description>([\s\S]*?)<\/description>/i);
      descRaw = descMatch ? descMatch[1].trim() : "Consulte los detalles del puesto en el enlace original.";
    }
    
    descRaw = descRaw.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1')
                     .replace(/<!\[CDATA\[/gi, '')
                     .replace(/\]\]>/gi, '')
                     .trim();
    
    descRaw = cleanHtml(descRaw);
    if (descRaw.length > 700) {
      descRaw = descRaw.slice(0, 700) + "...";
    }

    // 4. Extract creator/author/company if present
    const creatorMatch = content.match(/<(dc:creator|creator|author|company)>([\s\S]*?)<\/(dc:creator|creator|author|company)>/i);
    let companyRaw = creatorMatch ? creatorMatch[2].trim() : "";
    companyRaw = companyRaw.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1')
                           .replace(/<!\[CDATA\[/gi, '')
                           .replace(/\]\]>/gi, '')
                           .trim();

    // 5. Smart Title & Company parsing depending on source
    let title = titleRaw;
    let company = companyRaw || "Empresa Colaboradora";
    let location = "Remoto";
    let type: "remote" | "local" = "remote";
    
    if (isGoogleNews) {
      location = "España";
      type = "local";
      const lastDashIndex = titleRaw.lastIndexOf(" - ");
      if (lastDashIndex !== -1) {
        title = titleRaw.slice(0, lastDashIndex).trim();
        company = titleRaw.slice(lastDashIndex + 3).trim();
      } else {
        title = titleRaw;
        company = "Prensa / Ofertas Google News";
      }
    } else if (isRemoteOk) {
      if (titleRaw.includes(" at ")) {
        const parts = titleRaw.split(" at ");
        title = parts[0].trim();
        company = parts.slice(1).join(" at ").trim();
      } else if (titleRaw.includes(" is hiring a ")) {
        const parts = titleRaw.split(" is hiring a ");
        company = parts[0].trim();
        title = parts[1].trim();
      } else if (titleRaw.includes(":")) {
        const parts = titleRaw.split(":");
        company = parts[0].trim();
        title = parts.slice(1).join(":").trim();
      }
    } else if (isWwr) {
      if (titleRaw.includes(" at ")) {
        const parts = titleRaw.split(" at ");
        title = parts[0].trim();
        company = parts.slice(1).join(" at ").trim();
      } else if (titleRaw.includes(":")) {
        const parts = titleRaw.split(":");
        company = parts[0].trim();
        title = parts.slice(1).join(":").trim();
      }
    } else if (isJobicy) {
      const companyParenthesisMatch = titleRaw.match(/([\s\S]*?)\(([\s\S]*?)\)/i);
      if (companyParenthesisMatch) {
        title = companyParenthesisMatch[1].trim();
        company = companyParenthesisMatch[2].trim();
      }
    } else {
      if (titleRaw.includes(" at ")) {
        const parts = titleRaw.split(" at ");
        title = parts[0].trim();
        company = parts.slice(1).join(" at ").trim();
      } else if (titleRaw.includes(": ")) {
        const parts = titleRaw.split(": ");
        company = parts[0].trim();
        title = parts.slice(1).join(": ").trim();
      }
    }

    // Deduce industry based on text matching
    let industry = "Tecnología";
    const textToAnalyze = `${title} ${descRaw} ${urlLower}`.toLowerCase();
    
    if (textToAnalyze.includes("seo") || textToAnalyze.includes("search engine optimization") || textToAnalyze.includes("posicionamiento")) {
      industry = "Marketing";
    } else if (textToAnalyze.includes("marketing") || textToAnalyze.includes("social media") || textToAnalyze.includes("comunity manager")) {
      industry = "Marketing";
    } else if (textToAnalyze.includes("copywriter") || textToAnalyze.includes("writing") || textToAnalyze.includes("redactor") || textToAnalyze.includes("escritor")) {
      industry = "Marketing";
    } else if (textToAnalyze.includes("design") || textToAnalyze.includes("diseño") || textToAnalyze.includes("ui/ux") || textToAnalyze.includes("figma") || textToAnalyze.includes("creativo")) {
      industry = "Diseño";
    } else if (textToAnalyze.includes("finance") || textToAnalyze.includes("finanzas") || textToAnalyze.includes("cryptocurrency") || textToAnalyze.includes("analyst") || textToAnalyze.includes("crypto") || textToAnalyze.includes("inversión")) {
      industry = "Finanzas";
    }

    // Deduce dynamic salaries
    let salaryMin = 22000;
    let salaryMax = 35000;
    if (textToAnalyze.includes("senior") || textToAnalyze.includes("sr") || textToAnalyze.includes("lead") || textToAnalyze.includes("manager") || textToAnalyze.includes("principal")) {
      salaryMin = 45000;
      salaryMax = 75000;
    } else if (textToAnalyze.includes("junior") || textToAnalyze.includes("jr") || textToAnalyze.includes("intern") || textToAnalyze.includes("trainee") || textToAnalyze.includes("beca")) {
      salaryMin = 15000;
      salaryMax = 24000;
    }

    let finalDesc = descRaw;
    if (link) {
      finalDesc += `\n\n**🔗 Enlace original de postulación:** [Ver oferta completa](${link})`;
    }

    jobs.push({
      title,
      company,
      description: finalDesc,
      location,
      type,
      salaryMin,
      salaryMax,
      industry,
      url: link
    });
  }
  return jobs;
}

// Endpoint to Import Jobs from external APIs, RSS feeds, or Scraping
app.post("/api/jobs/import-external", async (req, res) => {
  const { mode, query, rssUrl, scrapeUrl, rawContent, userId, useAi } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "El ID de usuario (userId) es requerido." });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  let activeMode = mode;
  let activeRssUrl = rssUrl;
  let activeScrapeUrl = scrapeUrl;

  const inputUrl = rssUrl || scrapeUrl || "";
  if (inputUrl && (inputUrl.includes("google.com/search") || inputUrl.includes("google.es/search") || inputUrl.includes("google.cl/search") || inputUrl.includes("google.com.mx/search") || inputUrl.includes("google.com.ar/search"))) {
    const preprocessed = preprocessUrl(inputUrl);
    if (preprocessed !== inputUrl) {
      activeMode = "rss";
      activeRssUrl = preprocessed;
      console.log(`[Google Search Interceptor] Intercepted Google search URL and converted to Google News RSS feed URL: ${preprocessed}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // MODE 1: PUBLIC JOBS API (Remotive Open API)
    // -------------------------------------------------------------
    if (activeMode === "api") {
      const searchQuery = query || "react";
      const apiUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(searchQuery)}`;
      
      console.log(`[API Import] Fetching from Remotive: ${apiUrl}`);
      const fetchRes = await fetchWithTimeout(apiUrl);
      if (!fetchRes.ok) {
        throw new Error(`La API pública de Remotive devolvió un error de conexión (${fetchRes.status})`);
      }
      
      const data = await fetchRes.json() as any;
      if (!data || !data.jobs || !Array.isArray(data.jobs)) {
        throw new Error("Formato de respuesta desconocido de la API pública.");
      }

      const importedJobs: Job[] = [];
      const currentJobs = db.getJobs();

      // Take first 8 jobs to avoid flooding the DB
      for (const item of data.jobs.slice(0, 8)) {
        const uniqueId = `remotive-${item.id}`;
        
        // Skip duplicate
        if (currentJobs.some(j => j.id === uniqueId)) {
          continue;
        }

        // Parse salary Min/Max from text if present (e.g. "$60,000 - $80,000")
        let salaryMin = 30000;
        let salaryMax = 45000;
        if (item.salary) {
          const numbers = item.salary.match(/\d+[\d,.]*/g);
          if (numbers && numbers.length > 0) {
            const parsedNums = numbers
              .map((n: string) => parseInt(n.replace(/[,.]/g, ''), 10))
              .filter((num: number) => num > 1000);
            if (parsedNums.length > 0) {
              salaryMin = Math.min(...parsedNums);
              salaryMax = parsedNums.length > 1 ? Math.max(...parsedNums) : salaryMin + 12000;
            }
          }
        }

        // Map Category to Industry field
        let industry = "Tecnología";
        const cat = (item.category || "").toLowerCase();
        if (cat.includes("design") || cat.includes("creative") || cat.includes("ux")) {
          industry = "Diseño";
        } else if (cat.includes("marketing") || cat.includes("sales") || cat.includes("seo")) {
          industry = "Marketing";
        } else if (cat.includes("finance") || cat.includes("legal") || cat.includes("business")) {
          industry = "Finanzas";
        }

        const cleanDesc = cleanHtml(item.description);
        const excerptDesc = cleanDesc.length > 700 ? cleanDesc.slice(0, 700) + "...\n\n*(Oferta importada de Remotive API)*" : cleanDesc;

        // Ensure newly imported API jobs fit the strict 6-category target
        if (!isJobMatchingNiche(item.title, excerptDesc, industry)) {
          continue;
        }

        // Filter out informational news or non-Spanish / non-Spain vacancies
        if (!isActualJobOffer(item.title, excerptDesc, true)) {
          continue;
        }

        const newJob: Job = {
          id: uniqueId,
          title: item.title,
          company: item.company_name,
          description: excerptDesc,
          location: item.candidate_required_location || "Remoto",
          type: "remote",
          salaryMin,
          salaryMax,
          industry,
          recruiterId: "web-importer",
          postedAt: item.publication_date ? new Date(item.publication_date).toISOString() : new Date().toISOString(),
          isVerifiedCompany: true,
          url: item.url || undefined
        };

        db.addJob(newJob);
        importedJobs.push(newJob);
      }

      // Add real-time notification
      db.addNotification({
        id: `notif-api-${Date.now()}`,
        userId,
        message: `🌐 Se buscaron ofertas de empleo en la API de Remotive sobre "${searchQuery}". Se importaron con éxito ${importedJobs.length} ofertas nuevas.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, count: importedJobs.length, jobs: importedJobs });
    }

    // -------------------------------------------------------------
    // MODE 2: RSS FEED PARSING VIA GEMINI
    // -------------------------------------------------------------
    else if (activeMode === "rss") {
      const urlToFetch = activeRssUrl || "https://weworkremotely.com/categories/remote-programming-jobs.rss";
      
      console.log(`[RSS Import] Fetching RSS feed from: ${urlToFetch}`);
      const fetchRes = await fetchWithTimeout(urlToFetch);
      if (!fetchRes.ok) {
        throw new Error(`No se pudo descargar el feed RSS de "${urlToFetch}" (Estado ${fetchRes.status})`);
      }
      
      const xmlText = await fetchRes.text();
      let parsedResult: any = null;
      let usedGemini = false;

      // Only parse using Gemini if useAi is explicitly set to true, to respect user preference and avoid quotas
      if (useAi === true && aiClient) {
        try {
          const prompt = `
Analiza el siguiente fragmento de un documento XML de un RSS feed de ofertas de trabajo. Tu tarea es extraer hasta 6 ofertas de trabajo del canal y devolverlas en el formato JSON solicitado. Traduce los textos clave al español si están en inglés.

XML del RSS:
---
${xmlText.slice(0, 14000)}
---

Esquema de salida:
- title: Título del puesto en español.
- company: Nombre de la empresa.
- description: Un resumen conciso, atractivo y profesional de las funciones y requisitos en español (formato Markdown, sin HTML, máximo 650 caracteres).
- location: Ubicación del puesto (e.g. "Remoto" o ciudad/país).
- type: Estrictamente "local" o "remote".
- salaryMin: Salario mínimo anual en EUR (número estimado de mercado o 0 si no se indica).
- salaryMax: Salario máximo anual en EUR (número estimado de mercado o 0 si no se indica).
- industry: Sector de la vacante, clasificado estrictamente en una de estas categorías de creadores digitales: "Marketing Digital", "Redacción Web", "Social Media Manager", "Community Manager", "Producción Audiovisual", "Producción de Animación".
- url: Enlace o URL original del item RSS (del tag <link>).

Devuelve un objeto JSON con una propiedad "jobs" que sea un array de estos objetos.
`;

          const response = await aiClient.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  jobs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        company: { type: Type.STRING },
                        description: { type: Type.STRING },
                        location: { type: Type.STRING },
                        type: { type: Type.STRING },
                        salaryMin: { type: Type.INTEGER },
                        salaryMax: { type: Type.INTEGER },
                        industry: { type: Type.STRING },
                        url: { type: Type.STRING }
                      },
                      required: ["title", "company", "description", "location", "type", "industry"]
                    }
                  }
                },
                required: ["jobs"]
              }
            }
          });

          parsedResult = JSON.parse(response.text || "{}");
          if (parsedResult.jobs && Array.isArray(parsedResult.jobs)) {
            usedGemini = true;
          }
        } catch (apiErr: any) {
          console.warn("⚠️ [Gemini RSS Parsing Failed / Quota Exceeded] Falling back to manual RSS parser:", apiErr.message || apiErr);
        }
      }

      if (!parsedResult || !parsedResult.jobs || !Array.isArray(parsedResult.jobs)) {
        console.log("ℹ️ [RSS Parser] Extracting RSS jobs manually (fallback)...");
        const manualJobs = parseRssXmlManually(xmlText, urlToFetch);
        parsedResult = { jobs: manualJobs };
      }

      const isGoogleNewsFeed = urlToFetch.toLowerCase().includes("news.google.com");
      const importedJobs: Job[] = [];
      const currentJobs = db.getJobs();

      for (const item of parsedResult.jobs) {
        // Skip duplicate combinations of title & company
        const isDupe = currentJobs.some(
          j => j.title.toLowerCase() === item.title.toLowerCase() && 
               j.company.toLowerCase() === item.company.toLowerCase()
        );
        if (isDupe) continue;

        // Ensure newly imported RSS jobs fit the strict 6-category target
        if (!isJobMatchingNiche(item.title, item.description, item.industry)) {
          continue;
        }

        // Filter out informational news or tutorials (not real jobs) especially for Google News
        if (!isActualJobOffer(item.title, item.description, isGoogleNewsFeed)) {
          continue;
        }

        const newJob: Job = {
          id: `rss-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          title: item.title,
          company: item.company,
          description: usedGemini ? `${item.description}\n\n*(Oferta importada de canal RSS)*` : `${item.description}\n\n*(Oferta importada de canal RSS - Extracción Automática)*`,
          location: item.location || "Remoto",
          type: (item.type === "local" || item.type === "remote") ? item.type : "remote",
          salaryMin: Number(item.salaryMin) || 30000,
          salaryMax: Number(item.salaryMax) || 45000,
          industry: item.industry || "Tecnología",
          recruiterId: "web-importer",
          postedAt: new Date().toISOString(),
          isVerifiedCompany: true,
          url: item.url || undefined
        };

        db.addJob(newJob);
        importedJobs.push(newJob);
      }

      // Add notification
      db.addNotification({
        id: `notif-rss-${Date.now()}`,
        userId,
        message: usedGemini 
          ? `📻 Se importaron con éxito ${importedJobs.length} ofertas de empleo desde el canal RSS de forma inteligente.`
          : `📻 Se importaron con éxito ${importedJobs.length} ofertas de empleo desde el canal RSS usando el extractor de respaldo (cuota Gemini limitada).`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, count: importedJobs.length, jobs: importedJobs });
    }

    // -------------------------------------------------------------
    // MODE 3: WEB SCRAPING OF ANY JOB URL VIA GEMINI
    // -------------------------------------------------------------
    else if (activeMode === "scrape") {
      if (!activeScrapeUrl) {
        throw new Error("Se requiere la URL del sitio web para iniciar el scraping.");
      }

      let webpageContent = "";
      let directFetchSucceeded = false;

      console.log(`[Scrape Import] Attempting web scrap from URL: ${activeScrapeUrl}`);
      try {
        const fetchRes = await fetchWithTimeout(activeScrapeUrl);
        if (fetchRes.ok) {
          const rawHtml = await fetchRes.text();
          webpageContent = cleanHtml(rawHtml).slice(0, 14000);
          directFetchSucceeded = true;
          console.log(`[Scrape Import] Successfully fetched webpage. Length: ${webpageContent.length}`);
        } else {
          throw new Error(`Error de red HTTP: ${fetchRes.status}`);
        }
      } catch (err) {
        console.warn(`[Scrape Import] Direct crawl blocked or failed:`, err);
        // Fallback to manual pasted raw content if provided
        if (rawContent && rawContent.trim() !== '') {
          webpageContent = rawContent;
          console.log(`[Scrape Import] Using user manual raw pasted content fallback`);
        } else {
          throw new Error(`No pudimos raspar de forma directa la dirección web debido a restricciones de seguridad del portal o de red. Por favor copia y pega el texto de la oferta en el campo de texto manual de abajo.`);
        }
      }

      if (!aiClient) {
        throw new Error("El cliente de Gemini no está disponible para analizar la página web.");
      }

      const prompt = `
Analiza el siguiente texto extraído de una oferta de empleo publicada en un portal web. Tu tarea es extraer la información estructurada de la vacante y traducirla o adaptarla al español con un formato limpio.

Texto de la página web:
---
${webpageContent}
---

Esquema JSON requerido:
1. title: Título en español de la oferta de trabajo.
2. company: Nombre de la empresa ofertante.
3. description: Descripción detallada y estructurada del puesto en español (puedes incluir requerimientos, funciones y beneficios). Formato Markdown. Máximo 1000 caracteres.
4. location: Ubicación (ciudad, país o "Remoto").
5. type: Estrictamente "local" o "remote".
6. salaryMin: Salario anual mínimo estimado en EUR (número, usa 0 si no se menciona o no es deducible).
7. salaryMax: Salario anual máximo estimado en EUR (número, usa 0 si no se menciona o no es deducible).
8. industry: Sector de la oferta, clasificado estrictamente en una de estas categorías de creadores digitales: "Marketing Digital", "Redacción Web", "Social Media Manager", "Community Manager", "Producción Audiovisual", "Producción de Animación".

Devuelve únicamente el objeto JSON con estos campos.
`;

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              company: { type: Type.STRING },
              description: { type: Type.STRING },
              location: { type: Type.STRING },
              type: { type: Type.STRING },
              salaryMin: { type: Type.INTEGER },
              salaryMax: { type: Type.INTEGER },
              industry: { type: Type.STRING }
            },
            required: ["title", "company", "description", "location", "type", "industry"]
          }
        }
      });

      const parsedJob = JSON.parse(response.text || "{}");
      if (!parsedJob.title || !parsedJob.company) {
        throw new Error("No se pudo detectar un título de puesto o una empresa válidos en el texto de la página.");
      }

      // Check niche match
      if (!isJobMatchingNiche(parsedJob.title, parsedJob.description, parsedJob.industry || "")) {
        return res.status(400).json({ 
          error: "La oferta escaneada no pertenece a los sectores autorizados (Marketing Digital, Redacción Web, Social Media, Community Manager, Producción Audiovisual o Animación)." 
        });
      }

      const newJob: Job = {
        id: `scraped-${Date.now()}`,
        title: parsedJob.title,
        company: parsedJob.company,
        description: `${parsedJob.description}\n\n*(Oferta extraída mediante Web Scraping desde: ${activeScrapeUrl})*`,
        location: parsedJob.location || "Remoto",
        type: (parsedJob.type === "local" || parsedJob.type === "remote") ? parsedJob.type : "remote",
        salaryMin: Number(parsedJob.salaryMin) || 0,
        salaryMax: Number(parsedJob.salaryMax) || 0,
        industry: parsedJob.industry || "Tecnología",
        recruiterId: "web-importer",
        postedAt: new Date().toISOString(),
        isVerifiedCompany: false
      };

      db.addJob(newJob);

      // Add notification
      db.addNotification({
        id: `notif-scrape-${Date.now()}`,
        userId,
        message: `🕷️ ¡Web Scraping exitoso! Se ha extraído, traducido e incorporado la vacante de "${newJob.title}" en "${newJob.company}" directamente a la bolsa de trabajo.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, directFetch: directFetchSucceeded, job: newJob });
    }

    res.status(400).json({ error: "Modo de importación desconocido o no admitido." });

  } catch (error) {
    console.error("Error in job import backend handler:", error);
    res.status(500).json({ 
      error: "Error al realizar la importación de la vacante.", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Delete Job posting
app.delete("/api/jobs/:id", (req, res) => {
  const success = db.deleteJob(req.params.id);
  if (success) {
    res.json({ success: true, message: "Oferta de trabajo eliminada." });
  } else {
    res.status(404).json({ error: "Oferta de trabajo no encontrada." });
  }
});

// Get all Applications
app.get("/api/applications", (req, res) => {
  const { candidateId, recruiterId } = req.query;
  
  if (candidateId) {
    return res.json(db.getApplicationsByCandidate(candidateId as string));
  } else if (recruiterId) {
    return res.json(db.getApplicationsByRecruiter(recruiterId as string));
  }
  
  res.json(db.getApplications());
});

// Submit Application
app.post("/api/applications", (req, res) => {
  const { jobId, candidateId, resumeTailored, coverLetterTailored } = req.body;

  if (!jobId || !candidateId) {
    return res.status(400).json({ error: "jobId y candidateId son requeridos." });
  }

  const job = db.getJobById(jobId);
  if (!job) return res.status(404).json({ error: "Oferta de trabajo no encontrada." });

  const candidate = db.getUserById(candidateId);
  if (!candidate) return res.status(404).json({ error: "Candidato no encontrado." });

  const newApp = {
    id: `app-${Date.now()}`,
    jobId,
    candidateId,
    status: 'Applied' as const,
    appliedAt: new Date().toISOString(),
    resumeTailored,
    coverLetterTailored
  };

  const savedApp = db.addApplication(newApp);

  // Notify recruiter
  db.addNotification({
    id: `notif-rec-${Date.now()}`,
    userId: job.recruiterId,
    message: `📨 Nueva postulación recibida de ${candidate.name} para la vacante "${job.title}".`,
    type: 'info',
    read: false,
    createdAt: new Date().toISOString()
  });

  // Notify candidate
  db.addNotification({
    id: `notif-cand-${Date.now()}`,
    userId: candidateId,
    message: `✅ Has postulado con éxito al puesto de "${job.title}" en "${job.company}".`,
    type: 'success',
    read: false,
    createdAt: new Date().toISOString(),
    emailSentTo: candidate.email
  });

  res.status(201).json(savedApp);
});

// Update Application Status (Recruiter only)
app.put("/api/applications/:id/status", (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "El estado es requerido." });

  const appObj = db.getApplicationById(req.params.id);
  if (!appObj) return res.status(404).json({ error: "Postulación no encontrada." });

  const updatedApp = db.updateApplicationStatus(req.params.id, status);
  
  const candidate = db.getUserById(appObj.candidateId);
  const statusLabels: Record<string, string> = {
    'Applied': 'Postulado',
    'Screening': 'Selección inicial',
    'Interview': 'Entrevista programada',
    'Offered': 'Oferta de empleo formal',
    'Rejected': 'Postulación finalizada'
  };

  const label = statusLabels[status] || status;

  // Add real-time notification
  db.addNotification({
    id: `notif-status-${Date.now()}`,
    userId: appObj.candidateId,
    message: `📢 El estado de tu solicitud para "${appObj.jobTitle}" en "${appObj.companyName}" ha cambiado a: **${label}**.`,
    type: status === 'Offered' ? 'success' : status === 'Rejected' ? 'alert' : 'info',
    read: false,
    createdAt: new Date().toISOString(),
    emailSentTo: candidate?.email
  });

  res.json(updatedApp);
});

// Get User Notifications
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId es requerido." });
  res.json(db.getNotifications(userId as string));
});

// Mark all Notifications as Read
app.post("/api/notifications/read-all", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId es requerido." });
  db.markAllNotificationsAsRead(userId);
  res.json({ success: true });
});

// Mark single Notification as Read
app.put("/api/notifications/:id/read", (req, res) => {
  const success = db.markNotificationAsRead(req.params.id);
  res.json({ success });
});

// GEMINI: Tailor CV to a specific Job description
app.post("/api/gemini/tailor-cv", async (req, res) => {
  const { cvText, jobTitle, jobCompany, jobDescription } = req.body;

  if (!cvText || !jobTitle || !jobDescription) {
    return res.status(400).json({ error: "Campos requeridos faltantes para la optimización." });
  }

  if (!aiClient) {
    return res.status(503).json({ 
      error: "El servicio de Inteligencia Artificial de Gemini no está disponible porque falta la clave de API." 
    });
  }

  try {
    const prompt = `
Eres un reclutador experto y redactor profesional de currículums. Tu tarea es adaptar el currículum actual de un candidato de forma óptima a una oferta de trabajo específica.

Aquí está el currículum actual del candidato:
---
${cvText}
---

Aquí están los detalles de la oferta de trabajo:
- Título del Puesto: ${jobTitle}
- Empresa: ${jobCompany || 'Confidencial'}
- Descripción del Puesto: ${jobDescription}

Debes optimizar el currículum de manera profesional y realista:
1. Resalta las experiencias, proyectos y habilidades que coincidan directamente con los requisitos del puesto.
2. Utiliza palabras clave relevantes extraídas de la descripción de la oferta.
3. Asegúrate de mantener la veracidad de la información del candidato pero redactándola con mayor impacto y relevancia comercial.
4. Genera también una Carta de Presentación (Carta de Motivación) altamente persuasiva de aproximadamente 3-4 párrafos que el candidato pueda enviar junto con este CV.

Devuelve tu respuesta estructurada estrictamente bajo el siguiente esquema JSON con dos claves:
- "resumeTailored": El currículum completamente adaptado y optimizado con formato Markdown profesional.
- "coverLetterTailored": La carta de presentación profesional con formato Markdown.
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumeTailored: { 
              type: Type.STRING, 
              description: "El currículum optimizado redactado en español con formato Markdown profesional." 
            },
            coverLetterTailored: { 
              type: Type.STRING, 
              description: "Una carta de presentación convincente redactada en español con formato Markdown." 
            }
          },
          required: ["resumeTailored", "coverLetterTailored"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No se pudo obtener una respuesta válida de Gemini.");
    }

    const result = JSON.parse(outputText.trim());
    res.json(result);

  } catch (error) {
    console.error("Gemini CV Tailoring Error:", error);
    res.status(500).json({ 
      error: "Ocurrió un error al procesar el CV con la IA de Gemini.", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// ==========================================
// AUTOMATIC DAILY JOB SYNCHRONIZATION
// ==========================================

async function runAutomaticJobSync() {
  console.log("⏰ [Automatic Sync] Starting scheduled automatic job import...");
  let totalImported = 0;

  // 1. Fetch from Remotive API for "marketing" (matching our digital niches)
  try {
    const apiUrl = "https://remotive.com/api/remote-jobs?search=marketing";
    console.log(`⏰ [Automatic Sync] Fetching Remotive API: ${apiUrl}`);
    const fetchRes = await fetchWithTimeout(apiUrl, 8000);
    if (fetchRes.ok) {
      const data = await fetchRes.json() as any;
      if (data && Array.isArray(data.jobs)) {
        const currentJobs = db.getJobs();
        let count = 0;
        for (const item of data.jobs.slice(0, 10)) {
          const uniqueId = `remotive-${item.id}`;
          if (currentJobs.some(j => j.id === uniqueId)) continue;

          let salaryMin = 30000;
          let salaryMax = 45000;
          if (item.salary) {
            const numbers = item.salary.match(/\d+[\d,.]*/g);
            if (numbers && numbers.length > 0) {
              const parsedNums = numbers
                .map((n: string) => parseInt(n.replace(/[,.]/g, ''), 10))
                .filter((num: number) => num > 1000);
              if (parsedNums.length > 0) {
                salaryMin = Math.min(...parsedNums);
                salaryMax = parsedNums.length > 1 ? Math.max(...parsedNums) : salaryMin + 12000;
              }
            }
          }

          let industry = "Marketing Digital";
          const cat = (item.category || "").toLowerCase();
          if (cat.includes("design") || cat.includes("creative") || cat.includes("ux")) {
            industry = "Diseño";
          } else if (cat.includes("marketing") || cat.includes("sales") || cat.includes("seo")) {
            industry = "Marketing Digital";
          } else if (cat.includes("finance") || cat.includes("legal") || cat.includes("business")) {
            industry = "Otros";
          }

          const cleanDesc = cleanHtml(item.description);
          const excerptDesc = cleanDesc.length > 700 ? cleanDesc.slice(0, 700) + "...\n\n*(Oferta importada automáticamente de Remotive)*" : cleanDesc;

          // Apply strict niche check
          if (!isJobMatchingNiche(item.title, excerptDesc, industry)) {
            continue;
          }

          // Filter out informational news or non-Spanish / non-Spain vacancies
          if (!isActualJobOffer(item.title, excerptDesc, true)) {
            continue;
          }

          db.addJob({
            id: uniqueId,
            title: item.title,
            company: item.company_name,
            description: excerptDesc,
            location: item.candidate_required_location || "Remoto",
            type: "remote",
            salaryMin,
            salaryMax,
            industry,
            recruiterId: "web-importer",
            postedAt: item.publication_date ? new Date(item.publication_date).toISOString() : new Date().toISOString(),
            isVerifiedCompany: true,
            url: item.url || undefined
          });
          count++;
        }
        totalImported += count;
        console.log(`⏰ [Automatic Sync] Successfully imported ${count} remote jobs from Remotive API.`);
      }
    }
  } catch (err) {
    console.error("❌ [Automatic Sync] Remotive API fetch failed:", err);
  }

  // 2. Fetch from the specific Google News RSS feeds for our exact target niches (fully manual to avoid rate limits)
  const feedsToSync = [
    { name: "Google News - Marketing Digital", url: "https://news.google.com/rss/search?q=marketing+digital+empleo+OR+vacante+OR+trabajo&hl=es&gl=ES&ceid=ES:es" },
    { name: "Google News - Redacción Web", url: "https://news.google.com/rss/search?q=redaccion+web+OR+copywriter+empleo+OR+vacante+OR+trabajo&hl=es&gl=ES&ceid=ES:es" },
    { name: "Google News - Social Media Manager", url: "https://news.google.com/rss/search?q=social+media+manager+empleo+OR+vacante+OR+trabajo&hl=es&gl=ES&ceid=ES:es" },
    { name: "Google News - Community Manager", url: "https://news.google.com/rss/search?q=community+manager+empleo+OR+vacante+OR+trabajo&hl=es&gl=ES&ceid=ES:es" },
    { name: "Google News - Producción Audiovisual", url: "https://news.google.com/rss/search?q=produccion+audiovisual+OR+editor+video+empleo+OR+vacante+OR+trabajo&hl=es&gl=ES&ceid=ES:es" },
    { name: "Google News - Producción de Animación", url: "https://news.google.com/rss/search?q=animacion+OR+animador+empleo+OR+vacante+OR+trabajo&hl=es&gl=ES&ceid=ES:es" }
  ];

  for (const feed of feedsToSync) {
    try {
      console.log(`⏰ [Automatic Sync] Fetching RSS feed (${feed.name}): ${feed.url}`);
      const fetchRes = await fetchWithTimeout(feed.url, 10000);
      if (fetchRes.ok) {
        const xmlText = await fetchRes.text();
        const parsedJobs = parseRssXmlManually(xmlText, feed.url);
        
        if (Array.isArray(parsedJobs) && parsedJobs.length > 0) {
          const currentJobs = db.getJobs();
          let count = 0;
          for (const item of parsedJobs) {
            // Check duplicates
            const isDupe = currentJobs.some(
              j => j.title.toLowerCase() === item.title.toLowerCase() && 
                   j.company.toLowerCase() === item.company.toLowerCase()
            );
            if (isDupe) continue;

            // Apply strict niche check
            if (!isJobMatchingNiche(item.title, item.description, item.industry || "Otros")) {
              continue;
            }

            // Filter out general news / blog articles (not actual job vacancies)
            if (!isActualJobOffer(item.title, item.description, true)) {
              continue;
            }

            db.addJob({
              id: `rss-auto-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
              title: item.title,
              company: item.company,
              description: `${item.description}\n\n*(Oferta importada automáticamente de feed RSS: ${feed.name})*`,
              location: item.location || "Remoto",
              type: item.type || "remote",
              salaryMin: item.salaryMin || 30000,
              salaryMax: item.salaryMax || 45000,
              industry: item.industry || "Marketing Digital",
              recruiterId: "web-importer",
              postedAt: new Date().toISOString(),
              isVerifiedCompany: true,
              url: item.url || undefined
            });
            count++;
          }
          totalImported += count;
          console.log(`⏰ [Automatic Sync] Successfully imported ${count} jobs from ${feed.name}.`);
        }
      } else {
        console.warn(`⚠️ [Automatic Sync] Failed to fetch feed ${feed.name}: HTTP status ${fetchRes.status}`);
      }
    } catch (err: any) {
      console.error(`❌ [Automatic Sync] Error fetching/parsing feed ${feed.name}:`, err.message || err);
    }
  }

  console.log(`⏰ [Automatic Sync] Finished scheduled job import. Total new jobs added: ${totalImported}`);
}

// ==========================================
// VITE AND STATIC SERVING
// ==========================================

async function startServer() {
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
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    
    // Database Cleanup: Remove any stale news articles or incompatible jobs that were previously imported
    const runPruning = () => {
      try {
        const currentJobs = db.getJobs();
        let prunedCount = 0;
        for (const j of currentJobs) {
          const isNiche = isJobMatchingNiche(j.title, j.description, j.industry);
          const isImported = j.recruiterId === "web-importer";
          const isJob = isActualJobOffer(j.title, j.description, isImported);
          if (!isNiche || !isJob) {
            db.deleteJob(j.id);
            prunedCount++;
          }
        }
        if (prunedCount > 0) {
          console.log(`🧹 [Startup Cleanup] Pruned ${prunedCount} non-job items / news articles from database.`);
        }
      } catch (cleanErr: any) {
        console.error("⚠️ [Startup Cleanup] Failed to run database job pruning:", cleanErr.message || cleanErr);
      }
    };

    runPruning(); // Run immediately for local db.json
    setTimeout(runPruning, 3500); // Run again after 3.5 seconds to cleanly prune rows loaded from PostgreSQL background sync

    // Trigger automatic synchronization 5 seconds after startup
    setTimeout(() => {
      runAutomaticJobSync();
    }, 5000);

    // Schedule synchronization to run every 24 hours (86400000 ms)
    setInterval(() => {
      runAutomaticJobSync();
    }, 24 * 60 * 60 * 1000);
  });
}

startServer();
