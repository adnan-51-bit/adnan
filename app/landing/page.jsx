export default function LandingPage() {
  return (
    <main style={{fontFamily:"Arial,sans-serif",background:"#f7f8fa",color:"#111827",minHeight:"100vh"}}>
      <section style={{maxWidth:1120,margin:"0 auto",padding:"24px 24px 80px"}}>
        <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0 70px"}}>
          <strong style={{fontSize:22}}>AnfragenZentrale</strong>
          <a href="#demo" style={{background:"#111827",color:"#fff",padding:"11px 16px",borderRadius:8,textDecoration:"none"}}>Demo anfragen</a>
        </nav>

        <div style={{maxWidth:780}}>
          <div style={{display:"inline-block",padding:"7px 11px",borderRadius:999,background:"#eef2ff",color:"#3730a3",fontSize:13,fontWeight:700}}>
            ONLINE-ANFRAGEN IM BLICK
          </div>
          <h1 style={{fontSize:"clamp(42px,7vw,76px)",lineHeight:1.02,letterSpacing:"-0.04em",margin:"22px 0"}}>
            Keine Online-Anfrage<br/>soll verloren gehen.
          </h1>
          <p style={{fontSize:21,lineHeight:1.55,color:"#667085",maxWidth:680}}>
            Anfragen aus Website, E-Mail und Formularen zentral erfassen, priorisieren und nachverfolgen.
            Einfacher Überblick für kleine Unternehmen.
          </p>
          <div style={{display:"flex",gap:12,marginTop:28,flexWrap:"wrap"}}>
            <a href="#demo" style={{background:"#111827",color:"#fff",padding:"14px 20px",borderRadius:9,textDecoration:"none",fontWeight:700}}>Kostenlose Demo</a>
            <a href="#so-funktionierts" style={{border:"1px solid #d0d5dd",color:"#111827",padding:"14px 20px",borderRadius:9,textDecoration:"none",background:"#fff"}}>So funktioniert es</a>
          </div>
        </div>

        <section style={{marginTop:80,background:"#fff",border:"1px solid #e4e7ec",borderRadius:18,padding:24,boxShadow:"0 15px 40px rgba(16,24,40,.06)"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {[
              ["Neue Anfragen","12","Heute"],
              ["Hohe Priorität","3","Offen"],
              ["Follow-ups","5","Fällig"]
            ].map(([a,b,c])=><div key={a} style={{padding:18,border:"1px solid #eaecf0",borderRadius:12}}><div style={{color:"#667085",fontSize:13}}>{a}</div><strong style={{display:"block",fontSize:34,margin:"8px 0"}}>{b}</strong><span style={{color:"#667085"}}>{c}</span></div>)}
          </div>
          <div style={{marginTop:20,border:"1px solid #eaecf0",borderRadius:12,overflow:"hidden"}}>
            {[
              ["Muster GmbH","Angebotsanfrage","Hoch","Neu"],
              ["Beispiel Service","Terminwunsch","Mittel","Offen"],
              ["Demo Betrieb","Rückfrage","Niedrig","Erledigt"]
            ].map(([a,b,c,d])=><div key={a} style={{display:"grid",gridTemplateColumns:"1.3fr 1.5fr .8fr .8fr",gap:12,padding:15,borderBottom:"1px solid #eaecf0",fontSize:14}}><strong>{a}</strong><span>{b}</span><span>{c}</span><span>{d}</span></div>)}
          </div>
        </section>

        <section id="so-funktionierts" style={{padding:"90px 0 20px"}}>
          <h2 style={{fontSize:40,marginBottom:30}}>So funktioniert es</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[
              ["01","Anfrage kommt rein","Eine Anfrage wird zentral erfasst."],
              ["02","Anfrage wird strukturiert","Quelle, Kategorie und Priorität werden übersichtlich dargestellt."],
              ["03","Nachverfolgung","Offene Vorgänge und Follow-ups bleiben sichtbar."]
            ].map(([n,t,d])=><div key={n} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:14,padding:22}}><div style={{fontSize:13,color:"#667085",fontWeight:700}}>{n}</div><h3>{t}</h3><p style={{color:"#667085",lineHeight:1.5}}>{d}</p></div>)}
          </div>
        </section>

        <section id="demo" style={{marginTop:70,background:"#111827",color:"#fff",borderRadius:18,padding:"45px 30px"}}>
          <h2 style={{fontSize:40,margin:"0 0 12px"}}>Möchten Sie sehen, wie es funktioniert?</h2>
          <p style={{color:"#d0d5dd",fontSize:18,maxWidth:650}}>Wir zeigen Ihnen den Ablauf anhand einer kurzen Demo. Noch keine automatische Einrichtung und keine Verpflichtung auf dieser Testseite.</p>
          <div style={{marginTop:24,display:"flex",gap:10,flexWrap:"wrap"}}>
            <input placeholder="Ihre E-Mail-Adresse" style={{padding:14,borderRadius:8,border:"0",minWidth:260,fontSize:15}} />
            <button style={{padding:"14px 20px",borderRadius:8,border:0,fontWeight:700,cursor:"pointer"}}>Demo anfragen</button>
          </div>
        </section>

        <footer style={{paddingTop:45,color:"#667085",fontSize:13}}>
          Test-Landingpage · Noch kein produktiver Kundenbetrieb · Stand 20.09.2026
        </footer>
      </section>
    </main>
  );
}
