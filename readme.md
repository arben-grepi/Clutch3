# Karelia-ammattikorkeakoulu

### Opinnäytetyö tiedot
- **Viimeksi päivitetty:** lokakuu 2024
- **Toimesiantaja:** Grepi Softwares
- **Tyyppi:** Toiminnallinen
- **Ryhmän jäsenet:** Arben Grepi
- **Suunniteltu aloitus- ja lopetuspäivämäärä:** 11.9.2024 - 1.4.2025

### Opinnäytetyön suunnitelma

#### 1. Johdanto

Opinnäytetyön tavoitteena on kehittää fullstack-mobiilisovellus Grepi Software -yritykselle. Sovellus on suunnattu koripalloseuroille ja toimii työkaluna heittotaidon kehittämiseen simuloimalla pelitilanteessa koettavaa painetta heittoharjoituksissa. Tavoitteena on luoda kaupallinen mobiilisovellus, joka on saatavilla Android- ja iOS-alustoilla ja myynnissä lisenssimallilla sekä suomalaisille että kansainvälisille koripalloseuroille. Opinnäytetyössä suunnitellaan ja toteutetaan koko sovelluksen arkkitehtuuri, käyttöliittymä ja toiminnallisuudet alusta loppuun, keskittyen käyttäjäystävällisyyteen ja korkeaan laatuun. Lisäksi opinnäytetyössä selvitetään, kuinka hyvin valitut teknologiat soveltuvat mobiilisovelluksen kehittämiseen ja täyttävät sovellukselle asetetut vaatimukset.

#### 2. Opinnäytetyön tietoperusta/viitekehys

Opinnäytetyön tietoperusta liittyy koripalloseurojen harjoittelumenetelmien tutkimiseen,
erityisesti kilpailullisten harjoitusten ja paineen vaikutukseen pelaajien suorituskykyyn.
Sovellus hyödyntää teoreettisia näkökulmia suorituspaineen ja motivaation vaikutuksesta
urheilusuorituksiin. Lisäksi työssä arvioidaan, kuinka hyvin valitut teknologiat, kuten React
Native, Typescript ja PostgreSQL, soveltuvat projektin vaatimusten täyttämiseen.
Selvitetään myös, onko markkinoilla olemassa kilpailukykyisempiä tai parempia ratkaisuja
vastaavien sovellusten toteutukseen. Tämä varmistaa, että käytetyt työkalut tukevat
sovelluksen tavoitteita tehokkaasti ja ovat teknisesti perusteltuja.
Lisäksi on tärkeää tutustua Google Playn ja Apple Storen julkaisemisen prosessiin, joka
sisältää useita keskeisiä vaiheita. Prosessiin kuuluu muun muassa sovelluksen
rakentaminen ja pakkaaminen oikeassa muodossa, metatietojen ja kuvastojen luominen,
sekä sovelluksen testaus eri laitteilla. 

Julkaisuprosessissa on myös perustettava kehittäjätilit molempiin sovelluskauppoihin, jotta
sovelluksen voi ladata ja julkaista. Kehittäjätilin kautta hallitaan sovelluksen tietoja ja
julkaisuun liittyviä asetuksia. Lisäksi on määritettävä käyttöehdot ja tietosuojakäytännöt,
jotka kertovat käyttäjille, miten heidän tietojaan käsitellään. Tämä on tärkeää, jotta sovellus
täyttää kauppojen sääntöjen ja vaatimusten mukaiset vaatimukset, mikä puolestaan voi
vaikuttaa sovelluksen hyväksyntään.
Kokonaisuudessaan julkaisemiseen liittyvistä prosesseista on selvitettävä lisää ja sen
vaatimukset on huomioitava huolellisesti, jotta sovellus voidaan tuoda markkinoille
onnistuneesti ja käyttäjät voivat luottaa sen toimintaan.


#### 3. Opinnäytetyön tavoite ja tehtävä/tutkimustehtävä

Tavoitteena on luoda kaupallinen tuote, johon myydään lisenssejä niin suomalaisille kuin
kansainvälisille koripalloseuroille. Sovellus julkaistaan sekä Android- että Apple-laitteille, ja
se tulee saataville Google Play- ja Apple Store -kauppoihin. Sovelluksen
kokonaisarkkitehtuuri, käyttöliittymä ja toiminnallisuudet suunnitellaan ja toteutetaan alusta
loppuun, keskittyen käyttäjäystävällisyyteen ja toiminnan laatuun.
Sovellus mahdollistaa ryhmän/joukkueen sisäisen heittokilpailun pitkällä aikavälillä.
Mobiilisovelluksessa valmentaja luo joukkueelle oman ryhmän ja asettaa kilpailulle
heittämisen kriteerit, kuten heittoyritysten määrän tietyssä ajassa (esim. 10 heittoa päivän
aikana) ja heittopaikan (esim. vapaaheitto- tai kolmen pisteen viiva). Pelaajilla on vain yksi
mahdollisuus kuvata heittonsa määräajan sisällä, eikä useita videoita voi kuvata ja valita
parasta suoritusta. Sisään menneet heitot lasketaan, ja pelaajien heittoprosentit näkyvät
ryhmän sisällä. Tämä toimintamalli luo tervettä kilpailua pelaajien välille, lisää motivaatiota
heittotaidon kehittämiseen ja antaa pelaajille enemmän mahdollisuuksia harjoitella
heittämistä korkeapaineisissa tilanteissa, joita harjoituksissa on tavallisesti vaikea
simuloida.


#### 4. Opinnäytetyön menetelmälliset valinnat

Opinnäytetyössä käytetään toiminnallisen opinnäytetyön menetelmiä. Mobiilisovelluksen
kehittämiseen on valittu React Native, joka mahdollistaa sovelluksen rakentamisen yhdellä koodipohjalla sekä iOS- että Android-alustoille. Typescript on valittu ohjelmointikieleksi, koska se parantaa koodin luettavuutta ja varmistaa tiukemman tyyppitarkistuksen. Backend-kehityksessä käytän Node.js:ää ja Expressiä, jotka tarjoavat joustavan ratkaisun palvelinpuolen logiikkaan. Heittotilastojen ylläpitoon valitaan PostgreSQL, joka toimii skaalautuvana relaatiotietokantana välillä. Projektinhallintaan käytän Notion-ohjelmistoa,jonka avulla seuraan projektin vaiheet ja tehtävät todo-listojen ja kalenterin avulla. Tämä varmistaa, että työ etenee suunnitellusti ja että kehitysvaiheet ovat dokumentoituja.

#### 5. Luotettavuus ja eettisyys

Sovelluksen eettisyyteen kuuluu pelaajien suoritusten arvioinnin reiluus ja yksityisyyden
suojaaminen. Videoiden lataaminen ja arviointi toteutetaan tavalla, joka kunnioittaa
käyttäjien yksityisyyttä. Pelaajilla on mahdollisuus rajoittaa, ketkä näkevät heidän
suorituksensa

#### 6. Aikataulu ja rahoitus

Opinnäytetyön suunniteltu aloitus- ja lopetuspäivämäärä 11.9.2024 - 1.4.2025.
Sovelluksen julkaisemiseen liittyvät mahdolliset kulut voivat sisältää kehittäjätilin
rekisteröinnin, joka vaatii kertaluonteisen maksun Google Playlle (noin 25 USD) ja
vuosimaksun Apple App Storelle (noin 99 USD). Lisäksi infrastuktuurin ylläpidosta voi
syntyä kuluja, erityisesti jos sovellus hyödyntää pilvipalveluja, kuten AWS tai Heroku,
backendin tai tietokannan hallintaan. Käyttöehtojen ja tietosuojakäytäntöjen laatiminen voi
vaatia juridista asiantuntemusta, mikä voi lisätä kustannuksia.

#### 7. Pohdinta

Sovelluksen hyödynnettävyyttä arvioidaan sen kyvyllä parantaa pelaajien
heittoprosentteja, mikä osoittaa sovelluslogiikan tehokkuuden. Suunnittelemamme
sovellus on kehitetty skaalautuvaksi, ja sen ostoprosessi automatisoidaan, mikä tekee siitä
helposti saatavilla olevan ja käyttäjäystävällisen. Jos tuote saavuttaa myyntimenestystä,
yritykselle voidaan mahdollisesti hankkia rahoitusta tuotteen ja liiketoiminnan
jatkokehitykselle. Myynnistä saatavat tulot voivat myös olla arvokkaita resursseja, joita
voidaan sijoittaa tuotteen kehitykseen ja markkinointiin.
Jatkokehitysmahdollisuudet ovat laajat, erityisesti jos koripalloseurat kokevat sovelluksen
hyödylliseksi ja ovat valmiita maksamaan sen käytöstä. Tämä voi johtaa
lisäominaisuuksien ja -toimintojen kehittämiseen, jotka parantavat käyttäjäkokemusta ja
tekevät sovelluksesta entistä houkuttelevamman. Lisäksi käyttäjäpalautteen perusteella
voidaan tehdä tarvittavia muutoksia ja parannuksia, mikä varmistaa, että sovellus pysyy
kilpailukykyisenä ja relevanttina alalla. Kaiken kaikkiaan sovelluksen kehitykselle ja
hyödyntämiselle on erinomaisia mahdollisuuksia, mikä tekee siitä lupaavan investoinnin
tulevaisuudessa.
