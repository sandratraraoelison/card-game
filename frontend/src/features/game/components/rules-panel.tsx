export function RulesPanel() {
  return (
    <section className="content-panel rules-panel">
      <div className="eyebrow">LE RAMI MALGACHE</div>
      <h2>Quelques cartes. De belles combinaisons.</h2>
      <div className="rules-columns">
        <article>
          <h3>01 — La distribution</h3>
          <p>
            4 à 5 joueurs, 13 cartes chacun. Deux jeux de 52 cartes, sans jokers
            imprimés. Chaque exemplaire possède son propre identifiant.
          </p>
          <h3>02 — Les jokers</h3>
          <p>
            Une carte de référence tirée au hasard désigne une valeur. Les
            cartes de cette valeur et de la même couleur (rouge ou noire) sont
            de faux jokers : elles gardent leur rôle d’origine. Celles de la
            couleur opposée sont de vrais jokers.
          </p>
          <p>
            Exemple : référence 4♠ → faux jokers 4♠ et 4♣ ; vrais jokers 4♥ et
            4♦, dans les deux jeux.
          </p>
          <h3>03 — Votre tour</h3>
          <p>
            Piochez, préparez vos combinaisons, puis défaussez une carte. Une
            défausse est placée devant le joueur suivant et reste consultable
            dans l’historique. Préparer une combinaison réserve les cartes dans
            votre main, sans les retirer.
          </p>
        </article>
        <article>
          <h3>04 — Terminer à 13 cartes</h3>
          <p>
            4 + 3 + 3 + 3, avec un tri naturel de 3 et une suite naturelle de 3.
            Le groupe de 4 est une suite ou un carré. Les vrais jokers peuvent
            remplacer des cartes dans les autres groupes une fois ces deux
            groupes naturels présents.
          </p>
          <h3>05 — Afficher 10 cartes</h3>
          <p>
            4 + 3 + 3, entièrement naturels. Une carte désignée joker est
            autorisée à sa valeur et son enseigne d’origine : laissez «
            Substituer les vrais jokers » décoché. Aucun tri ou suite
            obligatoire supplémentaire n’est imposé à cette exposition. Elle ne
            termine pas la manche : seule une main valide de 13 cartes permet de
            gagner.
          </p>
          <h3>06 — Hypothèses configurables</h3>
          <ul>
            <li>As bas ou haut : A–2–3, Q–K–A et J–Q–K–A autorisés dans la même enseigne. Après le Roi, l’As vaut 14. K–A–2 reste interdit.</li>
            <li>
              Un tri/carré a des enseignes distinctes. Une suite a une seule
              enseigne, sans doublon de valeur.
            </li>
            <li>
              La référence est retirée des 104 cartes ; aucune défausse
              initiale.
            </li>
            <li>Seul J+1 peut reprendre la dernière défausse disponible.</li>
            <li>
              Les 10 cartes naturelles sont simplement exposées : la manche
              continue, sans défausse automatique ni passage du tour. Seules 13
              cartes permettent de gagner. Les cartes exposées restent dans
              votre main et peuvent être réorganisées ; retirer un de leurs
              groupes annule l’exposition.
            </li>
            <li>
              On peut déclarer avant pioche, ou après pioche avec une défausse.
              La pioche vide termine la manche sans gagnant, sans recyclage.
            </li>
          </ul>
        </article>
      </div>
      <div className="rules-note">
        Simulation locale : les adversaires piochent et défaussent selon une
        stratégie simple. Ils ne déclarent pas de victoire. Aucune mise, aucun
        score et aucune pénalité supplémentaire ne sont ajoutés.
      </div>
    </section>
  );
}
