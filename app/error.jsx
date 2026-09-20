"use client";

export default function GlobalError({reset}) {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,fontFamily:"system-ui"}}>
    <section style={{maxWidth:560,border:"1px solid #e4e7ec",borderRadius:14,padding:28}}>
      <p style={{fontSize:12,letterSpacing:".12em",fontWeight:800,color:"#667085"}}>WERKNETZ24 · SYSTEMFEHLER</p>
      <h1 style={{fontSize:30,margin:"8px 0"}}>Etwas ist schiefgelaufen.</h1>
      <p style={{color:"#667085",lineHeight:1.5}}>Der Fehler wurde abgefangen. Bitte erneut versuchen. Kritische Produktionsprozesse werden nicht automatisch fortgesetzt.</p>
      <button onClick={()=>reset()} style={{padding:"10px 14px",border:0,borderRadius:8,background:"#101828",color:"#fff",cursor:"pointer"}}>Erneut versuchen</button>
    </section>
  </main>;
}
