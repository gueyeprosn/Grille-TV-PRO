import { Router } from 'express';
import { nanoid } from 'nanoid';
import * as store from './store.js';
import { ensureAuth } from './auth.js';

const router = Router();

// Categories
router.get('/categories', async (req, res)=>{ res.json(await store.getCategories()) })
router.post('/categories', ensureAuth, async (req, res)=>{
  const list = await store.getCategories();
  const next = [...list, { id: nanoid(), ...req.body }];
  await store.setCategories(next);
  res.json(next);
})
router.put('/categories/:id', ensureAuth, async (req, res)=>{
  const list = await store.getCategories();
  const next = list.map(c=> c.id===req.params.id? { ...c, ...req.body }: c);
  await store.setCategories(next);
  res.json(next);
})
router.delete('/categories/:id', ensureAuth, async (req, res)=>{
  const list = await store.getCategories();
  const next = list.filter(c=> c.id!==req.params.id);
  await store.setCategories(next);
  res.json({ ok:true });
})
router.post('/categories:import', async (req, res)=>{
  const arr = Array.isArray(req.body)? req.body: [];
  await store.setCategories(arr);
  res.json({ ok:true, count: arr.length });
})

// Programs
router.get('/programs', async (req, res)=>{ res.json(await store.getPrograms()) })
router.post('/programs', ensureAuth, async (req, res)=>{
  const list = await store.getPrograms();
  const data = { id: nanoid(), ...req.body };
  await store.setPrograms([...list, data]);
  res.json(data);
})
router.put('/programs/:id', ensureAuth, async (req, res)=>{
  const list = await store.getPrograms();
  const next = list.map(p=> p.id===req.params.id? { ...p, ...req.body }: p);
  await store.setPrograms(next);
  res.json(next.find(p=> p.id===req.params.id));
})
router.delete('/programs/:id', ensureAuth, async (req, res)=>{
  const list = await store.getPrograms();
  const next = list.filter(p=> p.id!==req.params.id);
  await store.setPrograms(next);
  res.json({ ok:true });
})
router.post('/programs:import', async (req, res)=>{
  const arr = Array.isArray(req.body)? req.body: [];
  await store.setPrograms(arr);
  res.json({ ok:true, count: arr.length });
})

export default router;
