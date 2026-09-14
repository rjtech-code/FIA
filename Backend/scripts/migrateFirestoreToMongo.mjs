// ---------------------------------------------------------------------------
// ONE-TIME, MANUALLY-RUN reverse data migration: production Firestore (the
// "fia-career-tours" project this app used to run against, before it moved
// permanently to this Node/Express + MongoDB backend) -> MongoDB.
//
// THIS SCRIPT IS NOT RUN AUTOMATICALLY. It is deliberately not wired into
// `npm install`/`npm run dev`/`npm start` — real production data only moves
// once, under direct supervision.
//
// Prerequisites before running this:
//   1. A real Firebase service-account JSON key for the "fia-career-tours"
//      project (IAM & Admin -> Service Accounts -> whichever account was
//      used to access it, or a new one scoped to `roles/datastore.viewer` —
//      this script only reads Firestore, never writes to it).
//   2. That key's `client_email` / `private_key` supplied via env vars
//      locally (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) — NEVER commit
//      them, never paste them into chat/tickets.
//   3. `npm install firebase-admin` inside `Backend/` (kept OUT of
//      package.json's normal dependencies deliberately — it's only ever
//      needed for this one script, not for running the API).
//   4. A MongoDB the target application will actually use (MONGO_URI),
//      reachable from wherever you run this script.
//   5. The target Mongo database's `schools`/`superadmins`/etc. collections
//      should be EMPTY (or contain only data you're fine merging with) —
//      this script aborts if it finds existing documents, unless run with
//      --force (see below), specifically to avoid silently mixing this
//      dev/test machine's local data with real production data.
//
// Usage:
//   cd Backend
//   npm install firebase-admin
//   FIREBASE_PROJECT_ID=fia-career-tours \
//   FIREBASE_CLIENT_EMAIL=... \
//   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
//   MONGO_URI=mongodb://127.0.0.1:27017/fia \
//   node scripts/migrateFirestoreToMongo.mjs [--dry-run] [--force]
//
//   --dry-run   Reads and validates everything, prints what WOULD be
//               written, but performs no Mongo writes at all. Always run
//               this first.
//   --force     Skip the "target collections must be empty" safety check.
//
// After running for real: generate the AFE Official CSV export from this
// Node backend and compare it against a known-good reference export taken
// from the source data before migrating (or from the old system, if it's
// still reachable) — diff them byte-for-byte before pointing any real
// traffic at this backend. This is the single best acceptance test for the
// whole migration.
// ---------------------------------------------------------------------------

import mongoose from 'mongoose'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Service-account private keys are often pasted with literal `\n` sequences
// instead of real newlines (copy-pasted out of the downloaded JSON key) —
// unescape them the same way any other Firebase Admin SDK caller must.
function normalizePrivateKey(key) {
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key
}

async function initFirestore() {
  const projectId = requiredEnv('FIREBASE_PROJECT_ID')
  const clientEmail = requiredEnv('FIREBASE_CLIENT_EMAIL')
  const privateKey = normalizePrivateKey(requiredEnv('FIREBASE_PRIVATE_KEY'))
  const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)'

  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  return getFirestore(app, databaseId)
}

async function fetchAll(db, collectionName) {
  const snapshot = await db.collection(collectionName).get()
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
}

// Mirrors the ID-only normalization (trim+lowercase) Firestore used when
// building its document IDs for these collections. We only ever need this
// to RECOGNIZE which Mongo ObjectId a Firestore-side normalized
// district/login-id key refers to; the actual field VALUE we write to
// Mongo always comes from the document's own original-cased stored field,
// never from the (lossy, lowercased) ID segment itself.
function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

async function assertCollectionsEmpty(db, names) {
  if (FORCE) return
  for (const name of names) {
    // eslint-disable-next-line no-await-in-loop
    const count = await db.collection(name).estimatedDocumentCount()
    if (count > 0) {
      throw new Error(
        `Target MongoDB collection "${name}" already has ${count} document(s). ` +
          'Refusing to mix this dev/test data with a real migration. ' +
          'Point MONGO_URI at an empty database, or re-run with --force if you ' +
          'have already verified it is safe to merge.',
      )
    }
  }
}

async function main() {
  console.log(`[migrate] Starting Firestore -> MongoDB migration${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`)

  const db = await initFirestore()
  await mongoose.connect(requiredEnv('MONGO_URI'))
  const nativeDb = mongoose.connection.db

  await assertCollectionsEmpty(nativeDb, [
    'superadmins',
    'schools',
    'tours',
    'targets',
    'districtfeedbacktargets',
    'studentfeedbackbatches',
    'studentfeedbacks',
    'teacherfeedbacks',
  ])

  // -------------------------------------------------------------------
  // 1. Super Admins — Firestore doc ID is the normalized (trim+lowercase)
  //    login ID; Mongo needs a real ObjectId per document, and every other
  //    collection's createdBy/updatedBy references THAT ObjectId (not the
  //    normalized login-id string) — so build the id -> ObjectId map first.
  // -------------------------------------------------------------------
  const superAdminDocs = await fetchAll(db, 'superAdmins')
  const superAdminIdByNormalizedLoginId = new Map()
  const superAdminMongoDocs = superAdminDocs.map((doc) => {
    const _id = new mongoose.Types.ObjectId()
    superAdminIdByNormalizedLoginId.set(normalizeKey(doc.data.loginId), _id)
    return {
      _id,
      loginId: doc.data.loginId,
      password: doc.data.passwordHash, // already bcryptjs cost-12 — written as-is, no re-hash
      createdAt: new Date(doc.data.createdAt),
      updatedAt: new Date(doc.data.updatedAt),
    }
  })
  console.log(`[migrate] superAdmins: ${superAdminMongoDocs.length} document(s)`)

  // Firestore's `createdBy`/`updatedBy` fields on tours/targets/district
  // targets store the normalized-login-id STRING (the super admin doc's own
  // Firestore ID) rather than a Mongo ObjectId — resolve via the map above,
  // falling back to null (matches the 3 seeded tours' createdBy: null).
  function resolveSuperAdminRef(rawValue) {
    if (!rawValue) return null
    const resolved = superAdminIdByNormalizedLoginId.get(normalizeKey(rawValue))
    if (!resolved) {
      throw new Error(`Could not resolve super admin reference "${rawValue}" to a migrated SuperAdmin document.`)
    }
    return resolved
  }

  // -------------------------------------------------------------------
  // 2. Schools — Firestore doc ID is the UDISE itself; Mongo needs its own
  //    ObjectId, and the 4 feedback collections below need a udise ->
  //    ObjectId map to rebuild their `school` ref field (Firestore replaced
  //    that ref with a plain `udise` string field instead).
  // -------------------------------------------------------------------
  const schoolDocs = await fetchAll(db, 'schools')
  const schoolIdByUdise = new Map()
  const schoolMongoDocs = schoolDocs.map((doc) => {
    const _id = new mongoose.Types.ObjectId()
    schoolIdByUdise.set(doc.data.udise, _id)
    return {
      _id,
      udise: doc.data.udise,
      schoolName: doc.data.schoolName,
      district: doc.data.district,
      state: doc.data.state,
      // Absent on a school that was bulk-uploaded and never logged in yet
      // (a legacy lazy-hash-on-first-login school) — leave `password`
      // unset in that case too, so School.comparePassword()'s existing
      // "fallback: udise itself" legacy path covers it exactly the same way.
      ...(doc.data.passwordHash ? { password: doc.data.passwordHash } : {}),
      studentDummyIdSequence: doc.data.studentDummyIdSequence ?? 0,
      districtCode: doc.data.districtCode ?? '',
      postalCode: doc.data.postalCode ?? '',
      createdAt: new Date(doc.data.createdAt),
      updatedAt: new Date(doc.data.updatedAt),
    }
  })
  console.log(`[migrate] schools: ${schoolMongoDocs.length} document(s)`)

  function resolveSchoolRef(udise) {
    const resolved = schoolIdByUdise.get(udise)
    if (!resolved) {
      throw new Error(`Could not resolve school reference "${udise}" to a migrated School document.`)
    }
    return resolved
  }

  // -------------------------------------------------------------------
  // 3. Tours — carries over 1:1. AWS/Robotics/Music MUST retain code 1/2/3
  //    (never re-derive/reassign here). `deletedAt` is always explicit in
  //    Firestore (never omitted) so it maps straight across.
  // -------------------------------------------------------------------
  const tourDocs = await fetchAll(db, 'tours')
  const tourMongoDocs = tourDocs.map((doc) => ({
    tourId: doc.data.tourId,
    tourName: doc.data.tourName,
    code: doc.data.code,
    durationMinutes: doc.data.durationMinutes,
    createdBy: resolveSuperAdminRef(doc.data.createdBy),
    deletedAt: doc.data.deletedAt ? new Date(doc.data.deletedAt) : null,
    createdAt: new Date(doc.data.createdAt),
    updatedAt: new Date(doc.data.updatedAt),
  }))
  const highestTourCode = tourMongoDocs.reduce((max, tour) => Math.max(max, tour.code), 3)
  console.log(
    `[migrate] tours: ${tourMongoDocs.length} document(s) (highest code seen: ${highestTourCode} — ` +
      'the restored server re-derives "next tour code" live via MAX(code), so no separate counter document is needed)',
  )

  // -------------------------------------------------------------------
  // 4. Targets (Target Management module) — createdBy is required.
  // -------------------------------------------------------------------
  const targetDocs = await fetchAll(db, 'targets')
  const targetMongoDocs = targetDocs.map((doc) => ({
    financialYear: doc.data.financialYear,
    month: doc.data.month,
    state: doc.data.state,
    district: doc.data.district, // original casing, NOT the normalized ID segment
    teacherTarget: doc.data.teacherTarget,
    studentTarget: doc.data.studentTarget,
    createdBy: resolveSuperAdminRef(doc.data.createdBy),
    createdAt: new Date(doc.data.createdAt),
    updatedAt: new Date(doc.data.updatedAt),
  }))
  console.log(`[migrate] targets: ${targetMongoDocs.length} document(s)`)

  // -------------------------------------------------------------------
  // 5. District Feedback Targets (the 40%-quota per-district override).
  // -------------------------------------------------------------------
  const districtFeedbackTargetDocs = await fetchAll(db, 'districtFeedbackTargets')
  const districtFeedbackTargetMongoDocs = districtFeedbackTargetDocs.map((doc) => ({
    district: doc.data.district, // original casing
    targetPercent: doc.data.targetPercent,
    updatedBy: resolveSuperAdminRef(doc.data.updatedBy),
    createdAt: new Date(doc.data.updatedAt),
    updatedAt: new Date(doc.data.updatedAt),
  }))
  console.log(`[migrate] districtFeedbackTargets: ${districtFeedbackTargetMongoDocs.length} document(s)`)

  // -------------------------------------------------------------------
  // 6. Student Feedback Batches, Student Feedback, Teacher Feedback — all
  //    three need `school` rebuilt from `udise` via the map above.
  // -------------------------------------------------------------------
  const batchDocs = await fetchAll(db, 'studentFeedbackBatches')
  const batchMongoDocs = batchDocs.map((doc) => ({
    school: resolveSchoolRef(doc.data.udise),
    udise: doc.data.udise,
    schoolName: doc.data.schoolName,
    grade: doc.data.grade,
    studentCount: doc.data.studentCount,
    tours: doc.data.tours,
    language: doc.data.language ?? '',
    month: doc.data.month,
    financialYear: doc.data.financialYear,
    createdAt: new Date(doc.data.createdAt),
    updatedAt: new Date(doc.data.updatedAt),
  }))
  console.log(`[migrate] studentFeedbackBatches: ${batchMongoDocs.length} document(s)`)

  const studentFeedbackDocs = await fetchAll(db, 'studentFeedbacks')
  const studentFeedbackMongoDocs = studentFeedbackDocs.map((doc) => ({
    school: resolveSchoolRef(doc.data.udise),
    udise: doc.data.udise,
    schoolName: doc.data.schoolName,
    grade: doc.data.grade,
    studentDummyId: doc.data.studentDummyId,
    month: doc.data.month,
    financialYear: doc.data.financialYear,
    tours: doc.data.tours,
    createdAt: new Date(doc.data.createdAt),
  }))
  console.log(`[migrate] studentFeedbacks: ${studentFeedbackMongoDocs.length} document(s)`)

  const teacherFeedbackDocs = await fetchAll(db, 'teacherFeedbacks')
  const teacherFeedbackMongoDocs = teacherFeedbackDocs.map((doc) => ({
    school: resolveSchoolRef(doc.data.udise),
    udise: doc.data.udise,
    schoolName: doc.data.schoolName,
    tourId: doc.data.tourId,
    tourName: doc.data.tourName,
    language: doc.data.language,
    submittedBy: doc.data.submittedBy,
    contactNumber: doc.data.contactNumber ?? '',
    email: doc.data.email,
    month: doc.data.month,
    financialYear: doc.data.financialYear,
    recommendScore: doc.data.recommendScore,
    satisfactionResources: doc.data.satisfactionResources,
    easeIntegration: doc.data.easeIntegration,
    biggestBenefit: doc.data.biggestBenefit ?? '',
    improvements: doc.data.improvements ?? '',
    createdAt: new Date(doc.data.createdAt),
  }))
  console.log(`[migrate] teacherFeedbacks: ${teacherFeedbackMongoDocs.length} document(s)`)

  if (DRY_RUN) {
    console.log('[migrate] Dry run complete — no documents were written to MongoDB.')
    await mongoose.disconnect()
    return
  }

  // Native driver insertMany — bypasses every Mongoose schema hook (e.g.
  // School/SuperAdmin's pre('save') bcrypt hashing, which would otherwise
  // double-hash a password that's already a bcrypt hash coming out of
  // Firestore) and Mongoose's own timestamps:true auto-management, so the
  // original createdAt/updatedAt values are preserved exactly. Order matters
  // — collections referenced by an ObjectId must be inserted first.
  const insertions = [
    ['superadmins', superAdminMongoDocs],
    ['schools', schoolMongoDocs],
    ['tours', tourMongoDocs],
    ['targets', targetMongoDocs],
    ['districtfeedbacktargets', districtFeedbackTargetMongoDocs],
    ['studentfeedbackbatches', batchMongoDocs],
    ['studentfeedbacks', studentFeedbackMongoDocs],
    ['teacherfeedbacks', teacherFeedbackMongoDocs],
  ]

  for (const [collectionName, docs] of insertions) {
    if (docs.length === 0) continue
    // eslint-disable-next-line no-await-in-loop
    await nativeDb.collection(collectionName).insertMany(docs, { ordered: true })
    console.log(`[migrate] Inserted ${docs.length} document(s) into "${collectionName}"`)
  }

  console.log('[migrate] Migration complete.')
  console.log(
    '[migrate] Next: generate the AFE Official CSV export from this Node ' +
      'backend and compare it against a known-good reference export before ' +
      'pointing any real traffic here.',
  )

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('[migrate] FAILED:', error)
  process.exitCode = 1
})
