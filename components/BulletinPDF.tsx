import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Définir l'interface pour les props
interface BulletinProps {
  apprenant: {
    CODE_APPRENANT: string;
    NOM_APPRENANT: string;
    PRENOM_APPRENANT: string;
    DATE_NAISSANCE?: string;
  };
}

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "#0a5d81",
    fontWeight: "bold",
  },
  section: {
    margin: 10,
    padding: 10,
  },
  studentInfo: {
    marginBottom: 20,
    padding: 10,
    borderBottom: "1pt solid #0a5d81",
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    marginBottom: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#666",
    borderTop: "1pt solid #ddd",
    paddingTop: 10,
  },
});

// Composant principal du bulletin
const BulletinPDF: React.FC<BulletinProps> = ({ apprenant }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Bulletin de notes</Text>

      <View style={styles.studentInfo}>
        <Text style={styles.label}>Étudiant:</Text>
        <Text style={styles.value}>
          {apprenant.NOM_APPRENANT} {apprenant.PRENOM_APPRENANT}
        </Text>

        <Text style={styles.label}>ID:</Text>
        <Text style={styles.value}>{apprenant.CODE_APPRENANT}</Text>

        {apprenant.DATE_NAISSANCE && (
          <>
            <Text style={styles.label}>Date de naissance:</Text>
            <Text style={styles.value}>
              {new Date(apprenant.DATE_NAISSANCE).toLocaleDateString("fr-FR")}
            </Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text>Document généré le {new Date().toLocaleDateString("fr-FR")}</Text>
        <Text>ESPI - École Supérieure des Professions Immobilières</Text>
      </View>
    </Page>
  </Document>
);

export default BulletinPDF;
