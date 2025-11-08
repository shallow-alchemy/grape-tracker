import express from 'express';
import pg from 'pg';
import cors from 'cors';

const app = express();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:54321/electric',
});

app.use(cors());
app.use(express.json());

app.post('/api/vine', async (req, res) => {
  const { id, block, sequenceNumber, variety, plantingDate, health, notes, qrGenerated, createdAt, updatedAt } = req.body;

  try {
    await pool.query(
      'INSERT INTO vine (id, block, "sequenceNumber", variety, "plantingDate", health, notes, "qrGenerated", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [id, block, sequenceNumber, variety, plantingDate, health, notes, qrGenerated, createdAt, updatedAt]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error inserting vine:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/vine/:id', async (req, res) => {
  const { id } = req.params;
  const { qrGenerated, updatedAt } = req.body;

  try {
    await pool.query(
      'UPDATE vine SET "qrGenerated" = $1, "updatedAt" = $2 WHERE id = $3',
      [qrGenerated, updatedAt, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating vine:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
