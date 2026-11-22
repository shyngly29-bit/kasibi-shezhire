import { motion } from 'framer-motion'
import { transformJob } from '../data'
import { BRANCHES } from '../branches'
import Ornament from '../components/Ornament'
import NextBranch from '../components/NextBranch'
import GlassFolder from '@/components/ui/glass-folder-cards'

export default function Shezhire({ s, update, next }) {
  const fam = s.family
  const set = (i, k, v) => update({ family: fam.map((f, j) => (j === i ? { ...f, [k]: v } : f)) })
  const add = () => update({ family: [...fam, { role: 'Атамның әкесі', job: '' }] })
  const del = (i) => update({ family: fam.filter((_, j) => j !== i) })
  const filled = fam.filter((f) => f.job.trim())
  const fw = typeof window !== 'undefined' ? Math.min(250, window.innerWidth - 60) : 250
  const T = BRANCHES.test

  return (
    <div className="shz">
      <div className="head shz-head">
        <Ornament width={180} />
        <small className="kicker">01 · Шежіре бұтағы</small>
        <h2>Кәсіби шежіре</h2>
        <p>Ата-анаңнан, атаң мен әжеңнен сұра: олар кім болып жұмыс істеді? Әр кәсіп болашақта қалай өзгеретінін көресің.</p>
      </div>

      {/* Әулеттің шыны папкалары — тек оқушы енгізген нақты деректер */}
      {filled.length > 0 && (
        <div className="shz-folders">
          {filled.map((f, i) => (
            <GlassFolder
              key={f.role + f.job + i}
              width={fw} tone="light" art="heritage" seed={3 + i * 4} action="none"
              appearDelay={i * 120}
              label={f.role} meta={f.job}
              files={transformJob(f.job).map((j) => ({ name: j, meta: '2040' }))}
            />
          ))}
        </div>
      )}

      <div className="grid2">
        <div className="card form">
          <h3>Отбасы мүшелері</h3>
          {fam.map((f, i) => (
            <div className="fam-row" key={i}>
              <input value={f.role} onChange={(e) => set(i, 'role', e.target.value)} placeholder="Кім?" />
              <input value={f.job} onChange={(e) => set(i, 'job', e.target.value)} placeholder="Кәсібі (мыс.: ұста, малшы)" />
              {fam.length > 1 && <button className="x" onClick={() => del(i)} title="Өшіру">×</button>}
            </div>
          ))}
          <button className="btn ghost" onClick={add}>+ Буын қосу</button>
        </div>

        <div className="card tree">
          <h3>Менің шежіре ағашым</h3>
          {filled.length === 0 && <p className="muted">Кәсіптерді енгізгенде ағаш өседі…</p>}
          <div className="tree-root">
            {filled.map((f, i) => (
              <motion.div className="leaf" key={f.role + i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08 }}>
                <div className="leaf-old"><small>{f.role}</small><b>{f.job}</b></div>
                <div className="arrow">→ 2040</div>
                <div className="leaf-new">{transformJob(f.job).map((j) => <span key={j}>{j}</span>)}</div>
              </motion.div>
            ))}
          </div>
          {filled.length > 0 && (
            <div className="me">
              <b>{s.student.name || 'Мен'}</b>
              <small>ұрпақ сабақтастығын жалғастырамын</small>
            </div>
          )}
        </div>
      </div>

      {/* Келесі бірюза-көк бұтақ: импульс өтеді → «Қызығушылық тесті» */}
      <NextBranch
        kicker="02 · Келесі бұтақ"
        title="Қызығушылық тесті"
        text={filled.length ? '18 сұрақ арқылы қызығушылық типіңді анықта.' : 'Алдымен кем дегенде бір кәсіпті енгіз — бұтақ сонда ашылады.'}
        c1={T.c1} c2={T.c2}
        label="Тестке өту →"
        onGo={() => filled.length && next()}
      />
    </div>
  )
}
