export default function Home() {
  const leads = [
    { company: "Demo Betrieb GmbH", subject: "Angebotsanfrage", source: "Website", priority: "Hoch", status: "Neu" },
    { company: "Beispiel Service", subject: "Terminwunsch", source: "E-Mail", priority: "Mittel", status: "Offen" },
    { company: "Muster & Partner", subject: "Rückfrage", source: "Formular", priority: "Niedrig", status: "Erledigt" }
  ];

  return (
    <main style={{fontFamily:"Arial",maxWidth:1100,margin:"40px auto",padding:20}}>
      <p style={{fontSize:12,color:"#667085",letterSpacing:2}}>ONLINE-ANFRAGEN-AUTOMATION · MVP</p>
      <h1>Anfragen-Zentrale</h1>
      <p style={{color:"#667085"}}>Demo-Dashboard. Alle Kontakte sind künstliche Testdaten.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,margin:"30px 0"}}>
        <Metric title="Gesamt" value={leads.length}/>
        <Metric title="Offen" value={2}/>
        <Metric title="Hohe Priorität" value={1}/>
        <Metric title="Erledigt" value={1}/>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Unternehmen","Anfrage","Quelle","Priorität","Status"].map(x=><th key={x} style={{textAlign:"left",padding:12,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead>
        <tbody>{leads.map(l=><tr key={l.company}>{Object.values(l).map((v,i)=><td key={i} style={{padding:12,borderBottom:"1px solid #eee"}}>{v}</td>)}</tr>)}</tbody>
      </table>
      <p style={{marginTop:30,color:"#667085"}}>Nächste Stufe: echte Eingangskanäle, Datenbank, Benachrichtigungen und Follow-up-Automation.</p>
    </main>
  );
}

function Metric({title,value}) {
  return <div style={{border:"1px solid #e4e7ec",borderRadius:12,padding:18}}>
    <div style={{color:"#667085",fontSize:13}}>{title}</div>
    <strong style={{fontSize:28}}>{value}</strong>
  </div>;
}
