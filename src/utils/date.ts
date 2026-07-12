/**
 * Utility per la formattazione delle date in formato italiano (gg/mm/aaaa).
 * Le date nel database/API sono sempre in formato ISO (aaaa-mm-gg) o ISO datetime;
 * questa utility le converte SOLO per la visualizzazione, senza toccare il formato
 * usato negli <input type="date"> (che richiedono ISO) o nelle chiamate API.
 */

/** Converte una data ISO ("2026-07-11" o "2026-07-11T10:30:00") in "11/07/2026". */
export const formatDate = (data?: string | null): string => {
  if (!data) return '-';
  const soloData = data.split('T')[0];
  const parti = soloData.split('-');
  if (parti.length !== 3) return data; // fallback: valore non riconosciuto, mostra così com'è
  const [anno, mese, giorno] = parti;
  if (!anno || !mese || !giorno) return data;
  return `${giorno}/${mese}/${anno}`;
};

/** Converte una data+ora ISO in "11/07/2026 10:30". */
export const formatDateOra = (data?: string | null, ora?: string | null): string => {
  const dataIt = formatDate(data);
  if (!ora) return dataIt;
  return `${dataIt} ${ora.slice(0, 5)}`;
};

/** Converte un orario "10:30:00" o "10:30" in "10:30". */
export const formatOra = (ora?: string | null): string => {
  if (!ora) return '';
  return ora.slice(0, 5);
};

/** Converte una data ISO datetime completa (es. da un timestamp) in "11/07/2026 10:30". */
export const formatDateTime = (isoDatetime?: string | null): string => {
  if (!isoDatetime) return '-';
  const [dataParte, oraParte] = isoDatetime.split('T');
  const dataIt = formatDate(dataParte);
  if (!oraParte) return dataIt;
  return `${dataIt} ${oraParte.slice(0, 5)}`;
};

/** Converte "aaaa-mm" (es. "2026-09") in "Settembre 2026". */
const MESI_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
export const formatMeseAnno = (annoMese?: string | null): string => {
  if (!annoMese) return '-';
  const [anno, mese] = annoMese.split('-');
  const idx = parseInt(mese, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx > 11) return annoMese;
  return `${MESI_IT[idx]} ${anno}`;
};
