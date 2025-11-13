import type { NextPage } from 'next'
import Head from 'next/head'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>LOCALIA - App Local</title>
        <meta name="description" content="Gestión de pedidos para locales" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>LOCALIA - App Local</h1>
        <p>Panel de gestión para establecimientos</p>
      </main>
    </div>
  )
}

export default Home

