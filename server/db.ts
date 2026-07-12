/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { User, Job, Application, Notification, ApplicationStatus } from '../src/types.js';

const { Pool } = pg;
const DB_FILE = path.join(process.cwd(), 'db.json');

// Interface for Cache / local fallback
interface DatabaseSchema {
  users: User[];
  jobs: Job[];
  applications: Application[];
  notifications: Notification[];
}

const DEFAULT_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Especialista en Marketing Digital SEO/SEM',
    company: 'EcoStyle Moda & Estilo',
    description: 'Únete a nuestro equipo creativo para liderar campañas de SEO/SEM, estrategias integrales de marketing digital, optimización de motores de búsqueda y automatización de marketing. Experiencia en Google Analytics, Search Console y herramientas analíticas.',
    location: 'Madrid, España',
    type: 'local',
    salaryMin: 32000,
    salaryMax: 45000,
    industry: 'Marketing Digital',
    recruiterId: 'recruiter-admin',
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isVerifiedCompany: true,
    url: 'https://remotive.com'
  },
  {
    id: 'job-2',
    title: 'Redactor Web & Copywriter Creativo',
    company: 'Words Matter Agency',
    description: 'Buscamos un Redactor Web y Copywriter apasionado por la creación de artículos SEO, copys creativos para campañas digitales, guiones interactivos y optimización de contenido web. Imprescindible excelente redacción en español y nociones de SEO on-page.',
    location: 'Barcelona, España',
    type: 'local',
    salaryMin: 24000,
    salaryMax: 30000,
    industry: 'Redacción Web',
    recruiterId: 'recruiter-admin',
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isVerifiedCompany: true,
    url: 'https://weworkremotely.com'
  },
  {
    id: 'job-3',
    title: 'Social Media Manager & Estratega Digital',
    company: 'TrendWave Media Group',
    description: 'Buscamos un Social Media Manager experimentado para liderar el calendario editorial de marcas reconocidas, planificar estrategias de contenido orgánico y de pago en Instagram, TikTok y LinkedIn, y analizar métricas clave de engagement.',
    location: 'Remoto',
    type: 'remote',
    salaryMin: 30000,
    salaryMax: 42000,
    industry: 'Social Media Manager',
    recruiterId: 'recruiter-admin',
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isVerifiedCompany: true,
    url: 'https://remoteok.com'
  },
  {
    id: 'job-4',
    title: 'Community Manager de Marca & Atención al Cliente',
    company: 'Foodies Group España',
    description: 'Se busca Community Manager dinámico para interactuar con nuestra comunidad online, moderar comentarios, generar contenido diario en Stories/Reels, resolver dudas de clientes y dinamizar la presencia digital de nuestras cadenas de restauración.',
    location: 'Sevilla, España',
    type: 'local',
    salaryMin: 21000,
    salaryMax: 26000,
    industry: 'Community Manager',
    recruiterId: 'recruiter-admin',
    postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    isVerifiedCompany: false,
    url: 'https://news.google.com'
  },
  {
    id: 'job-5',
    title: 'Productor Audiovisual & Editor de Video Senior',
    company: 'PixelFrame Studios',
    description: 'Buscamos un profesional de la producción audiovisual con alto dominio en edición de video (Premiere, After Effects o DaVinci), postproducción de sonido y diseño de sonido. Trabajarás creando spots comerciales, videos corporativos y contenido de alto impacto.',
    location: 'Málaga, España',
    type: 'local',
    salaryMin: 28000,
    salaryMax: 38000,
    industry: 'Producción Audiovisual',
    recruiterId: 'recruiter-admin',
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isVerifiedCompany: true,
    url: 'https://remotive.com'
  },
  {
    id: 'job-6',
    title: 'Animador 2D/3D & Especialista en Producción de Animación',
    company: 'DreamArc Animation S.L.',
    description: 'Buscamos un animador digital talentoso para unirse a nuestros proyectos cinematográficos y publicitarios de producción de animación. Requerido dominio de Blender, Maya o Toon Boom, y excelente entendimiento de los principios clásicos de animación.',
    location: 'Remoto',
    type: 'remote',
    salaryMin: 34000,
    salaryMax: 48000,
    industry: 'Producción de Animación',
    recruiterId: 'recruiter-admin',
    postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    isVerifiedCompany: true,
    url: 'https://weworkremotely.com'
  }
];

export function categorizeIntoNiche(title: string, description: string, originalIndustry: string = ""): string {
  const combined = `${title} ${description} ${originalIndustry}`.toLowerCase();
  
  // Normalize accents/diacritics
  const clean = combined
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    clean.includes("animacion") || 
    clean.includes("animador") || 
    clean.includes("motion graphics") || 
    clean.includes("animation") || 
    clean.includes("animating") ||
    originalIndustry === "Producción de Animación"
  ) {
    return "Producción de Animación";
  }
  
  if (
    clean.includes("audiovisual") || 
    clean.includes("video") || 
    clean.includes("filmmaker") || 
    clean.includes("sonido") || 
    clean.includes("cine") || 
    clean.includes("edicion") || 
    clean.includes("editor de video") ||
    clean.includes("productor") ||
    originalIndustry === "Producción Audiovisual"
  ) {
    return "Producción Audiovisual";
  }

  if (
    clean.includes("community manager") || 
    clean.includes("cm") || 
    clean.includes("comunidad") || 
    clean.includes("moderador") || 
    clean.includes("moderacion") ||
    originalIndustry === "Community Manager"
  ) {
    return "Community Manager";
  }
  
  if (
    clean.includes("social media") || 
    clean.includes("rrss") || 
    clean.includes("redes sociales") || 
    clean.includes("social media manager") || 
    clean.includes("instagram") || 
    clean.includes("tiktok") || 
    clean.includes("twitter") ||
    originalIndustry === "Social Media Manager"
  ) {
    return "Social Media Manager";
  }

  if (
    clean.includes("redaccion") || 
    clean.includes("redactor") || 
    clean.includes("copywriter") || 
    clean.includes("copywriting") || 
    clean.includes("escritor") || 
    clean.includes("escritura") || 
    clean.includes("articulos") || 
    clean.includes("writer") || 
    clean.includes("writing") || 
    clean.includes("contenidos") || 
    clean.includes("content writer") || 
    clean.includes("redactar") ||
    originalIndustry === "Redacción Web"
  ) {
    return "Redacción Web";
  }

  // Default fallback
  return "Marketing Digital";
}

function initDB(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Ensure web-importer is always present in users list
      if (parsed.users && !parsed.users.some((u: any) => u.id === 'web-importer')) {
        parsed.users.push({
          id: 'web-importer',
          name: 'TrabajoLocal Importer',
          email: 'importer@trabajolocal.com',
          role: 'recruiter',
          isVerified: true,
          verifiedAt: new Date().toISOString(),
          location: 'Global',
          industry: 'Tecnología'
        });
      }
      // Normalize loaded jobs in DB cache
      if (parsed.jobs && Array.isArray(parsed.jobs)) {
        parsed.jobs = parsed.jobs.map((j: any) => ({
          ...j,
          industry: categorizeIntoNiche(j.title, j.description, j.industry)
        }));
      }
      return parsed;
    } catch (e) {
      console.error("Error reading db.json, resetting database", e);
    }
  }

  const initialSchema: DatabaseSchema = {
    users: [
      {
        id: 'web-importer',
        name: 'TrabajoLocal Importer',
        email: 'importer@trabajolocal.com',
        role: 'recruiter',
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        location: 'Global',
        industry: 'Tecnología'
      },
      {
        id: 'candidate-demo',
        name: 'Trinidad Suárez',
        email: 'trinidadsuarez@gmail.com',
        role: 'candidate',
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        location: 'Madrid, España',
        industry: 'Tecnología',
        cvName: 'Trinidad_Suarez_CV.pdf',
        cvText: `TRINIDAD SUÁREZ
E-mail: trinidadsuarez@gmail.com | Ubicación: Madrid, España
DESARROLLADOR WEB JUNIOR

PERFIL PROFESIONAL
Desarrolladora Web entusiasta con conocimientos sólidos en React, JavaScript y desarrollo de aplicaciones web responsivas. Proactiva, orientada al detalle y apasionada por resolver problemas lógicos y estéticos. Busco un puesto donde pueda contribuir a crear experiencias de usuario impecables.

HABILIDADES TÉCNICAS
- Frontend: HTML5, CSS3, JavaScript (ES6+), React, Tailwind CSS
- Herramientas y Metodologías: Git, GitHub, Visual Studio Code, Scrum
- Idiomas: Español (Nativo), Inglés (Intermedio - B2)

EDUCACIÓN Y FORMACIÓN
- Boot Camp de Desarrollo Web Full Stack (React/Node) | 2025
- Grado de Formación Profesional en Desarrollo de Aplicaciones Web | 2024`
      },
      {
        id: 'recruiter-admin',
        name: 'Carlos Reclutador',
        email: 'carlos.talent@innodigital.es',
        role: 'recruiter',
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        location: 'Madrid, España',
        industry: 'Tecnología'
      }
    ],
    jobs: DEFAULT_JOBS,
    applications: [
      {
        id: 'app-demo-1',
        jobId: 'job-1',
        candidateId: 'candidate-demo',
        status: 'Applied',
        appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        resumeTailored: 'CV adaptado para Desarrollador React Senior',
        coverLetterTailored: 'Carta de presentación personalizada'
      }
    ],
    notifications: [
      {
        id: 'notif-1',
        userId: 'candidate-demo',
        message: 'Bienvenido a TrabajoLocal. Tu perfil ha sido verificado con éxito.',
        type: 'success',
        read: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'notif-2',
        userId: 'candidate-demo',
        message: 'Has postulado con éxito al puesto "Desarrollador React Senior" en "Innovación Digital S.L.".',
        type: 'info',
        read: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf-8');
  } catch (err) {
    // Suppress warning if read-only filesystem
  }
  return initialSchema;
}

const dbState = {
  data: initDB()
};

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState.data, null, 2), 'utf-8');
  } catch (e) {
    // Log fallback error (e.g. read only container)
  }
}

// -------------------------------------------------------------
// POSTGRESQL CONNECTIVITY & SEED ENGINE
// -------------------------------------------------------------
let pool: pg.Pool | null = null;
const isPgConfigured = !!(process.env.DATABASE_URL || process.env.PGHOST);

if (isPgConfigured) {
  try {
    const config: any = {
      connectionString: process.env.DATABASE_URL,
    };
    // Enable SSL if cloud-hosted PostgreSQL (unless local environment)
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')) {
      config.ssl = {
        rejectUnauthorized: false
      };
    }
    pool = new Pool(config);
    console.log("🐘 [PostgreSQL] Initializing Pool with config:", process.env.DATABASE_URL ? "DATABASE_URL" : "Individual Env Vars");
    
    // Async Background setup
    initPostgresSchema();
  } catch (err) {
    console.error("❌ [PostgreSQL] Pool initialization error:", err);
  }
}

async function initPostgresSchema() {
  if (!pool) return;
  try {
    console.log("🐘 [PostgreSQL] Ensuring schemas exist...");
    
    // Create users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        role VARCHAR(50),
        is_verified BOOLEAN DEFAULT FALSE,
        verified_at VARCHAR(255),
        location VARCHAR(255),
        industry VARCHAR(255),
        cv_name VARCHAR(255),
        cv_text TEXT
      );
    `);

    // Create jobs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        company VARCHAR(255),
        description TEXT,
        location VARCHAR(255),
        type VARCHAR(50),
        salary_min INT DEFAULT 0,
        salary_max INT DEFAULT 0,
        industry VARCHAR(255),
        recruiter_id VARCHAR(255),
        posted_at VARCHAR(255),
        is_verified_company BOOLEAN DEFAULT FALSE,
        url VARCHAR(2048)
      );
    `);

    // Ensure url column exists in jobs table
    await pool.query(`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS url VARCHAR(2048);
    `).catch(err => {
      console.warn("🐘 [PostgreSQL] Optional alter table jobs failed (column might already exist):", err.message);
    });

    // Create applications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(255) PRIMARY KEY,
        job_id VARCHAR(255),
        candidate_id VARCHAR(255),
        status VARCHAR(50),
        applied_at VARCHAR(255),
        resume_tailored TEXT,
        cover_letter_tailored TEXT
      );
    `);

    // Create notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        read BOOLEAN DEFAULT FALSE,
        created_at VARCHAR(255)
      );
    `);

    console.log("🐘 [PostgreSQL] Schema matches successfully.");

    // Always guarantee that default jobs exist in PostgreSQL and are correctly classified
    for (const j of DEFAULT_JOBS) {
      await pool.query(`
        INSERT INTO jobs (id, title, company, description, location, type, salary_min, salary_max, industry, recruiter_id, posted_at, is_verified_company, url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          company = EXCLUDED.company,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          type = EXCLUDED.type,
          salary_min = EXCLUDED.salary_min,
          salary_max = EXCLUDED.salary_max,
          industry = EXCLUDED.industry,
          url = COALESCE(jobs.url, EXCLUDED.url)
      `, [j.id, j.title, j.company, j.description, j.location, j.type, j.salaryMin, j.salaryMax, j.industry, j.recruiterId, j.postedAt, j.isVerifiedCompany || false, j.url || null]).catch(err => {
        console.warn("🐘 [PostgreSQL] Failed to upsert default job:", j.id, err.message);
      });
    }

    // Always guarantee that the web-importer system user exists to prevent foreign key issues
    await pool.query(`
      INSERT INTO users (id, name, email, role, is_verified, verified_at, location, industry, cv_name, cv_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, ['web-importer', 'TrabajoLocal Importer', 'importer@trabajolocal.com', 'recruiter', true, new Date().toISOString(), 'Global', 'Tecnología', null, null]);

    // Load actual DB rows from PostgreSQL
    const usersRes = await pool.query("SELECT * FROM users");
    const jobsRes = await pool.query("SELECT * FROM jobs");
    const appsRes = await pool.query("SELECT * FROM applications");
    const notifsRes = await pool.query("SELECT * FROM notifications");

    if (usersRes.rowCount && usersRes.rowCount > 0) {
      console.log(`🐘 [PostgreSQL] Populating in-memory cache with existing DB rows (${usersRes.rowCount} users, ${jobsRes.rowCount} jobs)`);
      
      const mappedUsers: User[] = usersRes.rows.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isVerified: !!u.is_verified,
        verifiedAt: u.verified_at,
        location: u.location,
        industry: u.industry,
        cvName: u.cv_name,
        cvText: u.cv_text
      }));

      // Double check that 'web-importer' is in mappedUsers cache
      if (!mappedUsers.some(u => u.id === 'web-importer')) {
        mappedUsers.push({
          id: 'web-importer',
          name: 'TrabajoLocal Importer',
          email: 'importer@trabajolocal.com',
          role: 'recruiter',
          isVerified: true,
          verifiedAt: new Date().toISOString(),
          location: 'Global',
          industry: 'Tecnología'
        });
      }

      const mappedJobs: Job[] = jobsRes.rows.map((j: any) => {
        const normIndustry = categorizeIntoNiche(j.title, j.description, j.industry);
        if (normIndustry !== j.industry) {
          pgWrite(`UPDATE jobs SET industry = $1 WHERE id = $2`, [normIndustry, j.id]);
        }
        return {
          id: j.id,
          title: j.title,
          company: j.company,
          description: j.description,
          location: j.location,
          type: j.type as 'local' | 'remote',
          salaryMin: Number(j.salary_min) || 0,
          salaryMax: Number(j.salary_max) || 0,
          industry: normIndustry,
          recruiterId: j.recruiter_id,
          postedAt: j.posted_at,
          isVerifiedCompany: !!j.is_verified_company,
          url: j.url || undefined
        };
      });

      const mappedApps: Application[] = appsRes.rows.map((a: any) => ({
        id: a.id,
        jobId: a.job_id,
        candidateId: a.candidate_id,
        status: a.status,
        appliedAt: a.applied_at,
        resumeTailored: a.resume_tailored,
        coverLetterTailored: a.cover_letter_tailored
      }));

      const mappedNotifs: Notification[] = notifsRes.rows.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        message: n.message,
        type: n.type as 'info' | 'success' | 'alert' | 'email_simulated',
        read: !!n.read,
        createdAt: n.created_at
      }));

      dbState.data = {
        users: mappedUsers,
        jobs: mappedJobs,
        applications: mappedApps,
        notifications: mappedNotifs
      };
    } else {
      console.log("🐘 [PostgreSQL] DB is empty. Seeding default mock datasets into PG tables...");
      
      for (const u of dbState.data.users) {
        await pool.query(`
          INSERT INTO users (id, name, email, role, is_verified, verified_at, location, industry, cv_name, cv_text)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [u.id, u.name, u.email, u.role, u.isVerified || false, u.verifiedAt || null, u.location || null, u.industry || null, u.cvName || null, u.cvText || null]);
      }

      for (const j of dbState.data.jobs) {
        await pool.query(`
          INSERT INTO jobs (id, title, company, description, location, type, salary_min, salary_max, industry, recruiter_id, posted_at, is_verified_company, url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [j.id, j.title, j.company, j.description, j.location, j.type, j.salaryMin, j.salaryMax, j.industry, j.recruiterId, j.postedAt, j.isVerifiedCompany || false, j.url || null]);
      }

      for (const a of dbState.data.applications) {
        await pool.query(`
          INSERT INTO applications (id, job_id, candidate_id, status, applied_at, resume_tailored, cover_letter_tailored)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [a.id, a.jobId, a.candidateId, a.status, a.appliedAt, a.resumeTailored || null, a.coverLetterTailored || null]);
      }

      for (const n of dbState.data.notifications) {
        await pool.query(`
          INSERT INTO notifications (id, user_id, message, type, read, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [n.id, n.userId, n.message, n.type, n.read || false, n.createdAt]);
      }

      console.log("🐘 [PostgreSQL] Initial seed complete!");
    }
  } catch (error) {
    console.error("❌ [PostgreSQL] Failed during schema preparation or caching:", error);
  }
}

// Background asynchronous writer to write-through cache
function pgWrite(query: string, params: any[]) {
  if (!pool) return;
  pool.query(query, params).catch(err => {
    console.error("❌ [PostgreSQL] Async Background Write Error:", err, "Query:", query);
  });
}

// -------------------------------------------------------------
// MAIN BACKWARD-COMPATIBLE DB MODULE EXPORTS
// -------------------------------------------------------------
export const db = {
  // Users
  getUsers: (): User[] => dbState.data.users,
  getUserById: (id: string): User | undefined => dbState.data.users.find(u => u.id === id),
  getUserByEmail: (email: string): User | undefined => dbState.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  addUser: (user: User): User => {
    // Prevent duplicate emails
    const existing = dbState.data.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (existing) {
      return existing;
    }
    dbState.data.users.push(user);
    save();

    // PG sync
    pgWrite(`
      INSERT INTO users (id, name, email, role, is_verified, verified_at, location, industry, cv_name, cv_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [user.id, user.name, user.email, user.role, user.isVerified || false, user.verifiedAt || null, user.location || null, user.industry || null, user.cvName || null, user.cvText || null]);

    return user;
  },
  updateUser: (id: string, updates: Partial<User>): User | undefined => {
    const idx = dbState.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    dbState.data.users[idx] = { ...dbState.data.users[idx], ...updates };
    save();

    // PG sync
    const user = dbState.data.users[idx];
    pgWrite(`
      UPDATE users 
      SET name = $1, email = $2, role = $3, is_verified = $4, verified_at = $5, location = $6, industry = $7, cv_name = $8, cv_text = $9
      WHERE id = $10
    `, [user.name, user.email, user.role, user.isVerified || false, user.verifiedAt || null, user.location || null, user.industry || null, user.cvName || null, user.cvText || null, id]);

    return dbState.data.users[idx];
  },

  // Jobs
  getJobs: (): Job[] => dbState.data.jobs,
  getJobById: (id: string): Job | undefined => dbState.data.jobs.find(j => j.id === id),
  addJob: (job: Job): Job => {
    // Standardize industry based on niche classification
    job.industry = categorizeIntoNiche(job.title, job.description, job.industry);

    dbState.data.jobs.push(job);
    save();

    // PG Sync
    pgWrite(`
      INSERT INTO jobs (id, title, company, description, location, type, salary_min, salary_max, industry, recruiter_id, posted_at, is_verified_company, url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `, [job.id, job.title, job.company, job.description, job.location, job.type, job.salaryMin, job.salaryMax, job.industry, job.recruiterId, job.postedAt, job.isVerifiedCompany || false, job.url || null]);

    return job;
  },
  updateJob: (id: string, updates: Partial<Job>): Job | undefined => {
    const idx = dbState.data.jobs.findIndex(j => j.id === id);
    if (idx === -1) return undefined;
    dbState.data.jobs[idx] = { ...dbState.data.jobs[idx], ...updates };
    save();

    // PG Sync
    const job = dbState.data.jobs[idx];
    pgWrite(`
      UPDATE jobs
      SET title = $1, company = $2, description = $3, location = $4, type = $5, salary_min = $6, salary_max = $7, industry = $8, recruiter_id = $9, posted_at = $10, is_verified_company = $11, url = $12
      WHERE id = $13
    `, [job.title, job.company, job.description, job.location, job.type, job.salaryMin, job.salaryMax, job.industry, job.recruiterId, job.postedAt, job.isVerifiedCompany || false, job.url || null, id]);

    return dbState.data.jobs[idx];
  },
  deleteJob: (id: string): boolean => {
    const initialLen = dbState.data.jobs.length;
    dbState.data.jobs = dbState.data.jobs.filter(j => j.id !== id);
    if (dbState.data.jobs.length !== initialLen) {
      save();

      // PG Sync
      pgWrite(`DELETE FROM jobs WHERE id = $1`, [id]);
      return true;
    }
    return false;
  },

  // Applications
  getApplications: (): Application[] => dbState.data.applications,
  getApplicationsByCandidate: (candidateId: string): Application[] => {
    return dbState.data.applications
      .filter(a => a.candidateId === candidateId)
      .map(a => {
        const job = dbState.data.jobs.find(j => j.id === a.jobId);
        return {
          ...a,
          jobTitle: job?.title || 'Puesto Desconocido',
          companyName: job?.company || 'Empresa Desconocida'
        };
      });
  },
  getApplicationsByRecruiter: (recruiterId: string): Application[] => {
    const recruiterJobs = dbState.data.jobs.filter(j => j.recruiterId === recruiterId).map(j => j.id);
    return dbState.data.applications
      .filter(a => recruiterJobs.includes(a.jobId))
      .map(a => {
        const job = dbState.data.jobs.find(j => j.id === a.jobId);
        const candidate = dbState.data.users.find(u => u.id === a.candidateId);
        return {
          ...a,
          jobTitle: job?.title || 'Puesto Desconocido',
          companyName: job?.company || 'Empresa Desconocida',
          candidateName: candidate?.name || 'Candidato Desconocido'
        };
      });
  },
  getApplicationById: (id: string): Application | undefined => {
    const a = dbState.data.applications.find(app => app.id === id);
    if (!a) return undefined;
    const job = dbState.data.jobs.find(j => j.id === a.jobId);
    const candidate = dbState.data.users.find(u => u.id === a.candidateId);
    return {
      ...a,
      jobTitle: job?.title || 'Puesto Desconocido',
      companyName: job?.company || 'Empresa Desconocida',
      candidateName: candidate?.name || 'Candidato Desconocido'
    };
  },
  addApplication: (app: Application): Application => {
    dbState.data.applications.push(app);
    save();

    // PG Sync
    pgWrite(`
      INSERT INTO applications (id, job_id, candidate_id, status, applied_at, resume_tailored, cover_letter_tailored)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [app.id, app.jobId, app.candidateId, app.status, app.appliedAt, app.resumeTailored || null, app.coverLetterTailored || null]);

    const job = dbState.data.jobs.find(j => j.id === app.jobId);
    return {
      ...app,
      jobTitle: job?.title || 'Puesto Desconocido',
      companyName: job?.company || 'Empresa Desconocida'
    };
  },
  updateApplicationStatus: (id: string, status: ApplicationStatus): Application | undefined => {
    const idx = dbState.data.applications.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    dbState.data.applications[idx].status = status;
    save();

    // PG Sync
    pgWrite(`UPDATE applications SET status = $1 WHERE id = $2`, [status, id]);

    return db.getApplicationById(id);
  },

  // Notifications
  getNotifications: (userId: string): Notification[] => {
    return dbState.data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  addNotification: (notification: Notification): Notification => {
    dbState.data.notifications.push(notification);
    save();

    // PG Sync
    pgWrite(`
      INSERT INTO notifications (id, user_id, message, type, read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [notification.id, notification.userId, notification.message, notification.type, notification.read || false, notification.createdAt]);

    return notification;
  },
  markNotificationAsRead: (id: string): boolean => {
    const idx = dbState.data.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      dbState.data.notifications[idx].read = true;
      save();

      // PG Sync
      pgWrite(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id]);
      return true;
    }
    return false;
  },
  markAllNotificationsAsRead: (userId: string): void => {
    dbState.data.notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    save();

    // PG Sync
    pgWrite(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [userId]);
  }
};
