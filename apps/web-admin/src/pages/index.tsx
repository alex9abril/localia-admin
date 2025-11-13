import type { NextPage } from 'next'
import Head from 'next/head'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>LOCALIA - Panel Admin</title>
        <meta name="description" content="Panel de administración LOCALIA" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>LOCALIA - Panel Admin</h1>
        <p>Panel de administración y control</p>
      </main>
    </div>
  )
}

export default Home

