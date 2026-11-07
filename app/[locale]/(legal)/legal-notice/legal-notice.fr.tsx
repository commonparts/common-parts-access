import { Link } from '@/i18n/navigation'
import { DATA_LICENSE, TERMS_LICENSES_SECTION_HREF } from '@/lib/utils/licenses'

export default function LegalNoticeFr() {
  return (
    <>
      <section>
        <h2>1. Éditeur</h2>
        <p>
          Common Parts Access (accessible à l’adresse access.commonparts.org) est édité, à titre non professionnel, par
          une personne physique. Comme le permet la loi française aux éditeurs non professionnels, les éléments
          d’identification de l’éditeur ont été communiqués à l’hébergeur mentionné ci-dessous et ne sont pas publiés
          sur ce site.
        </p>
        <p>
          L’éditeur peut être contacté à l’adresse <a href="mailto:contact@commonparts.org">contact@commonparts.org</a>.
        </p>
      </section>

      <section>
        <h2>2. Hébergement</h2>
        <h3>2.1 Hébergement de l’application</h3>
        <p>L’application est hébergée par&nbsp;:</p>
        <ul>
          <li>Railway Corporation</li>
          <li>548 Market St PMB 68956, San Francisco, Californie 94104, États-Unis</li>
          <li>Téléphone&nbsp;: +1 415 707 7675</li>
          <li>E-mail&nbsp;: team@railway.com</li>
        </ul>

        <h3>2.2 Base de données et stockage des fichiers</h3>
        <p>La base de données et les fichiers stockés sont fournis par&nbsp;:</p>
        <ul>
          <li>Supabase Pte. Ltd.</li>
          <li>65 Chulia Street, #38-02/03, OCBC Centre, Singapour 049513</li>
          <li>E-mail&nbsp;: legal@supabase.com</li>
        </ul>
      </section>

      <section>
        <h2>3. Propriété intellectuelle et licences</h2>
        <p>
          Le code source de la plateforme Common Parts Access est publié sous licence MIT. Chaque pièce publiée reste
          sous la licence choisie par son auteur. Les <Link href="/terms">conditions d’utilisation</Link> décrivent ces
          licences et les droits qui y sont attachés.
        </p>
        <p>
          Les données d’index créées sur Common Parts Access (produits, références de produits, compatibilités entre
          pièces et produits, champs structurés rédigés ici et retours d’impression agrégés) sont publiées sous la{' '}
          <a href={DATA_LICENSE.url}>
            licence {DATA_LICENSE.name} ({DATA_LICENSE.shortName})
          </a>
          , avec l’attribution «&nbsp;{DATA_LICENSE.attribution}&nbsp;», comme le prévoit{' '}
          <Link href={TERMS_LICENSES_SECTION_HREF}>l’article 4.2 des conditions d’utilisation</Link>. Le contenu repris
          de la publication d’origine d’une pièce référencée et les fichiers des pièces restent sous la licence choisie
          par leur auteur.
        </p>
      </section>

      <section>
        <h2>4. Contact</h2>
        <p>Pour toute question relative aux présentes mentions légales&nbsp;:</p>
        <p>
          <a href="mailto:contact@commonparts.org">contact@commonparts.org</a>
        </p>
      </section>
    </>
  )
}
