export default function PrivacyFr() {
  return (
    <>
      <section>
        <h2>1. Introduction</h2>
        <p>
          Common Parts Access (accessible à l’adresse access.commonparts.org) est une plateforme ouverte de publication
          et d’accès à des pièces détachées numériques. C’est une interface officielle de l’infrastructure Common Parts.
        </p>
        <p>
          La présente politique de confidentialité explique quelles données personnelles sont collectées lorsque vous
          utilisez Common Parts Access, comment elles sont utilisées et de quels droits vous disposez sur vos données.
        </p>
        <p>
          Common Parts est le responsable du traitement de toutes les données personnelles traitées par l’intermédiaire
          de Common Parts Access. Vous pouvez nous contacter à tout moment à l’adresse contact@commonparts.org.
        </p>
      </section>

      <section>
        <h2>2. Responsable du traitement</h2>
        <p>Common Parts</p>
        <p>contact@commonparts.org</p>
        <p>access.commonparts.org</p>
        <p>
          Common Parts étant actuellement un projet sans personnalité morale, la personne physique responsable du
          traitement des données peut être identifiée sur demande à l’adresse de contact ci-dessus.
        </p>
      </section>

      <section>
        <h2>3. Données collectées</h2>
        <h3>3.1 Données de compte</h3>
        <p>Lorsque vous créez un compte sur Common Parts Access, nous collectons&nbsp;:</p>
        <ul>
          <li>votre adresse e-mail&nbsp;;</li>
          <li>votre nom d’utilisateur et votre nom affiché (tels que vous les indiquez)&nbsp;;</li>
          <li>votre mot de passe (conservé sous forme hachée&nbsp;: nous ne le conservons jamais en clair)&nbsp;;</li>
          <li>les informations de profil que vous choisissez d’ajouter (biographie, avatar).</li>
        </ul>

        <h3>3.2 Données de contenu</h3>
        <p>Lorsque vous publiez des pièces détachées ou d’autres contenus sur la plateforme, nous collectons&nbsp;:</p>
        <ul>
          <li>
            les fichiers de modèles 3D et les métadonnées associées (titre, description, matériau, paramètres
            d’impression)&nbsp;;
          </li>
          <li>les étiquettes, catégories et autres données de classement que vous fournissez.</li>
        </ul>

        <h3>3.3 Données d’utilisation</h3>
        <p>Lorsque vous utilisez Common Parts Access, nous enregistrons automatiquement&nbsp;:</p>
        <ul>
          <li>les collections et les mentions «&nbsp;j’aime&nbsp;» que vous créez&nbsp;;</li>
          <li>la date et l’heure des actions réalisées sur la plateforme.</li>
        </ul>
        <p>
          Les consultations de pièces, les téléchargements de fichiers et les clics sur le lien vers la source d’une
          pièce sont comptés de façon anonyme. Chacun est enregistré uniquement avec la pièce et l’heure (et, pour un
          clic sur un lien de source, l’indication qu’il a été fait sur la page de la pièce ou sur une carte de pièce),
          jamais avec votre compte, votre adresse IP (sous quelque forme que ce soit, hachée ou non) ou les informations
          de votre navigateur.
        </p>

        <h3>3.4 Données techniques</h3>
        <p>Pour le fonctionnement technique du service, nous traitons&nbsp;:</p>
        <ul>
          <li>les données de session conservées dans des cookies (voir la section 5)&nbsp;;</li>
          <li>
            les journaux de requêtes de notre hébergeur&nbsp;: Railway enregistre, pour chaque requête adressée à Common
            Parts Access, votre adresse IP, l’agent utilisateur de votre navigateur, la page demandée et l’heure. Ces
            journaux servent uniquement à faire fonctionner et à sécuriser le service, et sont conservés 7 jours (voir{' '}
            <a href="https://docs.railway.com/observability/logs#log-retention">
              la durée de conservation des journaux de Railway
            </a>{' '}
            et <a href="https://railway.com/legal/privacy">sa politique de confidentialité</a>)&nbsp;;
          </li>
          <li>
            les journaux de requêtes de notre fournisseur de base de données et d’authentification&nbsp;: Supabase
            enregistre l’adresse IP et l’agent utilisateur des requêtes que votre navigateur lui envoie directement,
            comme la connexion ou l’envoi d’un retour, pour les mêmes finalités et pendant la durée fixée par
            Supabase&nbsp;;
          </li>
          <li>
            les sessions de connexion&nbsp;: lorsque vous vous connectez, notre fournisseur d’authentification
            (Supabase) conserve l’adresse IP et l’agent utilisateur de votre appareil avec la session, afin de sécuriser
            votre compte. Ils sont supprimés lorsque vous vous déconnectez de cette session ou supprimez votre compte.
          </li>
        </ul>

        <h3>3.5 Retours</h3>
        <p>
          Lorsque vous envoyez un retour avec le bouton prévu à cet effet, nous conservons son type, son titre et sa
          description, l’adresse de la page sur laquelle vous vous trouviez, l’heure et, si vous êtes connecté, un lien
          vers votre compte. Pour le traiter&nbsp;:
        </p>
        <ul>
          <li>
            son type, son titre, sa description, l’adresse de la page et l’heure sont envoyés à Mistral AI, qui le
            classe&nbsp;;
          </li>
          <li>
            il est publié, avec son type, son titre, sa description, l’adresse de la page et l’heure, sous forme
            d’issue publique dans le dépôt GitHub de la plateforme. L’issue indique si l’expéditeur était connecté,
            jamais qui il est.
          </li>
        </ul>
        <p>
          N’incluez pas d’informations personnelles dans vos retours. Nous traitons les retours sur le fondement de
          notre intérêt légitime à améliorer le service (art. 6.1.f du RGPD). Les retours sont conservés pour assurer le
          suivi des problèmes qu’ils signalent&nbsp;; si vous supprimez votre compte, ils sont conservés sans le lien
          vers votre compte.
        </p>

        <h3>3.6 Auteurs des pièces référencées</h3>
        <p>
          Certaines pièces de Common Parts Access sont référencées&nbsp;: leurs fichiers restent sur la plateforme où
          leur auteur les a publiés (la source), et Common Parts Access renvoie vers celle-ci. Pour chaque pièce
          référencée, nous conservons, à partir de sa page publique à la source&nbsp;:
        </p>
        <ul>
          <li>le nom ou le pseudonyme sous lequel l’auteur l’a publiée&nbsp;;</li>
          <li>le lien vers le profil public de l’auteur à la source&nbsp;;</li>
          <li>le lien vers la publication d’origine, sa date de publication et sa licence.</li>
        </ul>
        <p>
          Ces informations sont affichées sur la page de la pièce pour créditer l’auteur, comme l’exigent les licences
          des pièces et les règles de la plateforme. Nous les traitons sur le fondement de notre intérêt légitime à
          créditer les auteurs et à respecter leurs licences (art. 6.1.f du RGPD). Si vous êtes l’auteur d’une pièce
          référencée, vous pouvez demander la correction de ces informations, ou le retrait de la pièce, à l’adresse
          contact@commonparts.org.
        </p>
      </section>

      <section>
        <h2>4. Bases légales et finalités</h2>
        <p>
          Nous traitons vos données personnelles sur les bases légales suivantes, prévues par le règlement général sur
          la protection des données (RGPD)&nbsp;:
        </p>
        <ul>
          <li>
            exécution d’un contrat (art. 6.1.b du RGPD)&nbsp;: création du compte, authentification et fourniture des
            services que vous demandez&nbsp;;
          </li>
          <li>
            intérêt légitime (art. 6.1.f du RGPD)&nbsp;: maintien de la sécurité et de l’intégrité de la plateforme,
            prévention des abus&nbsp;;
          </li>
          <li>
            consentement (art. 6.1.a du RGPD)&nbsp;: lorsque nous vous demandons votre accord explicite, par exemple
            pour les informations de profil facultatives.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Cookies</h2>
        <p>
          Common Parts Access utilise des cookies uniquement pour l’authentification, la gestion de session, la
          protection contre les abus sur les retours d’impression et la langue de l’interface. Aucun cookie publicitaire,
          de suivi ou de mesure d’audience n’est utilisé.
        </p>
        <ul>
          <li>Nom du cookie&nbsp;: cookie de jeton d’authentification Supabase (motif sb-*-auth-token)</li>
          <li>Finalité&nbsp;: conserve votre session authentifiée pour vous garder connecté.</li>
          <li>
            Type&nbsp;: strictement nécessaire. Ce cookie est indispensable au fonctionnement du service et ne requiert
            pas votre consentement.
          </li>
          <li>Fournisseur&nbsp;: Supabase, Inc. (notre fournisseur d’infrastructure d’authentification).</li>
          <li>Durée&nbsp;: session et conservation de courte durée (expire à la déconnexion ou à l’expiration de la session).</li>
        </ul>
        <ul>
          <li>Nom du cookie&nbsp;: cpa_reporter</li>
          <li>
            Finalité&nbsp;: contient un identifiant aléatoire, défini uniquement lorsque vous envoyez un retour
            d’impression sans compte, afin qu’un nouveau retour remplace le précédent et que le nombre de retours puisse
            être limité. Seule une empreinte irréversible de cet identifiant est conservée avec votre retour&nbsp;; aucune
            adresse IP n’est conservée.
          </li>
          <li>Type&nbsp;: strictement nécessaire à la fonction de retour d’impression que vous utilisez.</li>
          <li>Fournisseur&nbsp;: Common Parts Access (cookie interne).</li>
          <li>Durée&nbsp;: 12 mois.</li>
        </ul>
        <ul>
          <li>Nom du cookie&nbsp;: NEXT_LOCALE</li>
          <li>
            Finalité&nbsp;: contient la langue d’interface que vous avez utilisée en dernier («&nbsp;en&nbsp;» ou
            «&nbsp;fr&nbsp;»), afin qu’un lien dont l’adresse n’indique pas de langue s’ouvre dans cette langue. Il ne
            contient aucun identifiant.
          </li>
          <li>Type&nbsp;: strictement nécessaire pour afficher le service dans la langue que vous avez choisie.</li>
          <li>Fournisseur&nbsp;: Common Parts Access (cookie interne).</li>
          <li>Durée&nbsp;: session (supprimé à la fermeture du navigateur).</li>
        </ul>
        <p>
          Vous pouvez supprimer les cookies à tout moment depuis les paramètres de votre navigateur. Vous serez alors
          déconnecté de votre compte.
        </p>
      </section>

      <section>
        <h2>6. Sous-traitants</h2>
        <p>Nous faisons appel aux sous-traitants suivants pour faire fonctionner Common Parts Access.</p>
        <ul>
          <li>
            Supabase, Inc.&nbsp;: infrastructure de base de données, d’authentification et de stockage des fichiers, y
            compris ses journaux de requêtes et les sessions de connexion (voir la section 3.4). Supabase est certifié
            SOC 2 Type II.
          </li>
          <li>
            Railway&nbsp;: hébergement de l’application. Reçoit chaque requête adressée à Common Parts Access et
            conserve des journaux de requêtes (voir la section 3.4).
          </li>
          <li>
            Mistral AI&nbsp;: classement des retours. Reçoit le type, le titre, la description, l’adresse de la page et
            l’heure de chaque retour (voir la section 3.5).
          </li>
          <li>
            GitHub&nbsp;: hébergement du dépôt public de la plateforme, où les retours sont publiés sous forme d’issues
            avec leur type, leur titre, leur description, l’adresse de la page et l’heure (voir la section 3.5).
          </li>
        </ul>
        <p>
          Nous ne vendons, ne louons ni ne partageons vos données personnelles avec des tiers à des fins marketing ou
          publicitaires.
        </p>
      </section>

      <section>
        <h2>7. Durée de conservation</h2>
        <p>
          Nous conservons vos données personnelles tant que votre compte est actif. Si vous supprimez votre compte, vos
          données personnelles sont supprimées immédiatement, sauf lorsque leur conservation est exigée par la loi ou
          nécessaire au règlement d’un litige.
        </p>
        <p>
          Le contenu que vous avez publié sur la plateforme (pièces détachées, avec leurs fichiers et leurs métadonnées)
          est anonymisé et reste disponible après la suppression du compte, sauf si vous en demandez le retrait complet.
        </p>
      </section>

      <section>
        <h2>8. Vos droits</h2>
        <p>En application du RGPD, vous disposez des droits suivants sur vos données personnelles&nbsp;:</p>
        <ul>
          <li>droit d’accès&nbsp;: obtenir une copie des données personnelles que nous détenons à votre sujet&nbsp;;</li>
          <li>droit de rectification&nbsp;: corriger des données inexactes ou incomplètes&nbsp;;</li>
          <li>
            droit à l’effacement&nbsp;: demander la suppression de vos données personnelles (sous réserve des
            obligations légales de conservation)&nbsp;;
          </li>
          <li>droit à la limitation&nbsp;: demander que nous limitions le traitement de vos données&nbsp;;</li>
          <li>
            droit à la portabilité&nbsp;: recevoir vos données dans un format structuré et lisible par machine&nbsp;;
          </li>
          <li>droit d’opposition&nbsp;: vous opposer à un traitement fondé sur l’intérêt légitime&nbsp;;</li>
          <li>
            droit de retirer votre consentement&nbsp;: lorsque le traitement repose sur votre consentement, le retirer à
            tout moment, sans remettre en cause le traitement effectué auparavant.
          </li>
        </ul>
        <p>
          Pour exercer l’un de ces droits, écrivez-nous à l’adresse contact@commonparts.org. Nous vous répondrons dans
          un délai de 30 jours. Si vous estimez que vos droits n’ont pas été respectés, vous pouvez introduire une
          réclamation auprès de l’autorité de protection des données de votre pays.
        </p>
      </section>

      <section>
        <h2>9. Sécurité</h2>
        <p>
          Common Parts Access met en œuvre des mesures de sécurité conformes aux pratiques du secteur, notamment le
          chiffrement des données en transit (TLS), le stockage haché des mots de passe et une authentification par
          session gérée par Supabase. Aucun système n’est parfaitement sûr&nbsp;: nous vous recommandons d’utiliser un
          mot de passe robuste et unique pour votre compte.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Pour toute question, demande ou préoccupation relative à la présente politique de confidentialité ou au
          traitement de vos données personnelles&nbsp;:
        </p>
        <p>Common Parts</p>
        <p>
          <a href="mailto:contact@commonparts.org">contact@commonparts.org</a>
        </p>
        <p>access.commonparts.org</p>
      </section>
    </>
  )
}
