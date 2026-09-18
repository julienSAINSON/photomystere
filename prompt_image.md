Je vais te fournir :

1. une image utilisée dans mon jeu « Photo Mystère » ;
2. la réponse exacte attendue pour cette image.

À partir de **l'image et de la réponse attendue**, génère une liste de toutes les réponses qu'un enfant de 9 ans pourrait raisonnablement saisir et qui doivent être considérées comme correctes.

## Objectif

Le but est d'être **très tolérant sur l'orthographe**, tout en restant **strict sur le sens**.

L'enfant doit pouvoir faire une faute d'orthographe ou utiliser une formulation différente sans être considéré comme incorrect, à condition qu'il soit évident qu'il voulait donner la bonne réponse.

## Prends en compte

Génère les variantes pertinentes parmi les catégories suivantes :

* orthographe correcte ;
* fautes d'orthographe courantes chez un enfant de 9 ans ;
* lettre oubliée ;
* lettre ajoutée ;
* lettre doublée ;
* lettre remplacée par une lettre proche ;
* inversion de lettres ;
* erreur phonétique plausible ;
* accent oublié ;
* accent incorrect ;
* apostrophe oubliée ;
* espace oublié ;
* espace ajouté ;
* espaces multiples ;
* majuscules/minuscules ;
* article ajouté ou supprimé ;
* singulier/pluriel lorsque les deux sont réellement acceptables ;
* nom court et nom complet lorsque les deux désignent clairement la même chose ;
* prénom seul ou nom seul lorsqu'il permet clairement d'identifier la bonne réponse ;
* variante française courante ;
* variante étrangère couramment utilisée lorsque pertinente ;
* abréviation courante lorsqu'elle permet clairement d'identifier la réponse.

## Analyse de l'image

Utilise l'image pour vérifier le contexte.

Ne te contente pas de générer mécaniquement des fautes à partir du texte.

Vérifie que les réponses proposées correspondent bien à **ce que le joueur est censé identifier sur l'image**.

Si plusieurs éléments apparaissent sur l'image, utilise la réponse attendue pour déterminer précisément lequel doit être identifié.

## Ce qu'il ne faut PAS accepter

N'ajoute pas de réponses :

* trop générales ;
* approximatives ;
* ambiguës ;
* correspondant à un autre élément de l'image ;
* correspondant à la personne ayant créé une œuvre lorsque la réponse est l'œuvre ;
* correspondant au lieu lorsque la réponse est le monument ;
* correspondant à une catégorie lorsque la réponse est un élément précis ;
* qui sont simplement associées au sujet mais ne constituent pas une réponse correcte.

Par exemple, si :

`Réponse attendue : Tour Eiffel`

ne propose pas :

`Paris`

car Paris est le lieu où se trouve la Tour Eiffel et non la réponse.

## Nombre de variantes

Ne limite pas artificiellement le nombre de réponses.

Produis suffisamment de variantes pour couvrir les fautes **réalistes et plausibles** d'un enfant de 9 ans.

En revanche, ne génère pas des fautes artificielles ou absurdes simplement pour augmenter le nombre de réponses.

Chaque variante doit rester suffisamment proche pour qu'un humain puisse comprendre ce que l'enfant voulait écrire.

## Normalisation

Mon application normalise déjà les réponses en ignorant notamment :

* majuscules/minuscules ;
* espaces au début et à la fin ;
* espaces multiples.

Il n'est donc pas nécessaire de générer toutes les variantes de majuscules/minuscules ou d'espaces.

Concentre-toi sur les variantes qui apportent réellement quelque chose :

* fautes d'orthographe ;
* variantes lexicales ;
* erreurs phonétiques plausibles ;
* articles ;
* accents ;
* variantes de nom ;
* etc.

## Format de sortie obligatoire

Retourne **uniquement la liste des réponses**, sans explication, sans numérotation et sans Markdown.

Sépare chaque réponse avec :

`;`

Exemple :

`tour eiffel;la tour eiffel;tour eifel;tour efel;toureiffel;eiffel tower`

Ne mets **aucun point-virgule à la fin**.

## Informations fournies

Réponse attendue :

`[INSÉRER LA RÉPONSE ICI]`

Image :

`[FOURNIR L'IMAGE ICI]`

Analyse l'image et la réponse attendue avant de générer la liste.
