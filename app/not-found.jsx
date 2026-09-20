export default function NotFound() {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,fontFamily:"system-ui"}}>
    <section style={{textAlign:"center"}}>
      <p style={{fontSize:12,letterSpacing:".12em",fontWeight:800,color:"#667085"}}>404</p>
      <h1>Seite nicht gefunden</h1>
      <a href="/master">Zur Master-Zentrale</a>
    </section>
  </main>;
}
