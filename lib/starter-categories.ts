import type { ColorKey } from "./types";

// An optional starting point offered on the empty Categories page. Admins
// can rename, recolour or delete any of these, or skip them entirely and
// enter the sub-themes from the seminar brochure instead.
export const STARTER_CATEGORIES: Array<{
  name: string;
  description: string;
  color: ColorKey;
  keywords: string[];
}> = [
  {
    name: "Indian Writing in English",
    description: "Fiction, poetry and drama by Indian writers in English.",
    color: "ochre",
    keywords: ["indian", "india", "tagore", "narayan", "mulk raj anand", "raja rao", "anita desai", "arundhati roy", "rushdie", "amitav ghosh", "kamala das", "ezekiel", "ramanujan", "partition", "vikram seth"],
  },
  {
    name: "Postcolonial Studies",
    description: "Empire, nation, resistance and the afterlives of colonialism.",
    color: "claret",
    keywords: ["postcolonial", "colonial", "colonialism", "empire", "imperial", "hybridity", "decolonial", "orientalism", "nation", "nationalism", "bhabha", "spivak", "edward said", "fanon", "achebe", "ngugi"],
  },
  {
    name: "Diaspora & Migration",
    description: "Exile, displacement, belonging and transnational identities.",
    color: "teal",
    keywords: ["diaspora", "diasporic", "migration", "migrant", "immigrant", "exile", "displacement", "homeland", "belonging", "transnational", "expatriate", "lahiri", "bharati mukherjee", "naipaul", "rootless"],
  },
  {
    name: "Gender & Women’s Writing",
    description: "Feminist readings, women writers, gender and sexuality.",
    color: "rose",
    keywords: ["gender", "feminism", "feminist", "women", "woman", "patriarchy", "patriarchal", "female", "masculinity", "queer", "sexuality", "motherhood", "shashi deshpande", "manju kapur", "womanhood"],
  },
  {
    name: "Dalit & Subaltern Voices",
    description: "Caste, marginality and literatures of the oppressed.",
    color: "copper",
    keywords: ["dalit", "caste", "subaltern", "tribal", "adivasi", "marginal", "marginalised", "marginalized", "untouchability", "ambedkar", "bama", "omprakash valmiki", "oppression", "marginality"],
  },
  {
    name: "Ecocriticism & Environment",
    description: "Nature, ecology, climate and environmental humanities.",
    color: "sage",
    keywords: ["ecocriticism", "ecocritical", "ecology", "ecological", "environment", "environmental", "nature", "climate", "anthropocene", "ecofeminism", "landscape", "sustainability", "forest", "animal"],
  },
  {
    name: "British Literature",
    description: "From Chaucer and Shakespeare to the Romantics, Victorians and Modernists.",
    color: "navy",
    keywords: ["shakespeare", "milton", "chaucer", "romantic", "victorian", "modernism", "modernist", "woolf", "joyce", "t. s. eliot", "dickens", "austen", "wordsworth", "keats", "hardy", "elizabethan", "british"],
  },
  {
    name: "American & World Literatures",
    description: "American, African, Caribbean, Canadian and other literatures in English.",
    color: "indigo",
    keywords: ["american", "morrison", "hemingway", "faulkner", "whitman", "african", "caribbean", "canadian", "australian", "world literature", "walcott", "afro-american", "black", "harlem"],
  },
  {
    name: "Literary Theory & Criticism",
    description: "Theory, method and critical approaches to texts.",
    color: "slate",
    keywords: ["theory", "criticism", "structuralism", "poststructuralism", "deconstruction", "psychoanalysis", "psychoanalytic", "marxist", "narratology", "semiotics", "reader response", "new historicism", "intertextuality", "postmodern"],
  },
  {
    name: "Translation & Comparative Literature",
    description: "Translation, regional literatures and comparative readings.",
    color: "plum",
    keywords: ["translation", "translated", "translator", "comparative", "bhasha", "regional", "hindi", "urdu", "bengali", "maithili", "magahi", "bhojpuri", "cross-cultural", "vernacular"],
  },
  {
    name: "Language, Linguistics & ELT",
    description: "Linguistics, English language teaching and learning.",
    color: "olive",
    keywords: ["linguistics", "linguistic", "language", "elt", "teaching", "pedagogy", "learners", "learning", "grammar", "phonetics", "sociolinguistics", "communication", "classroom", "esl", "efl", "curriculum", "nep"],
  },
  {
    name: "Film, Media & Digital Humanities",
    description: "Adaptation, cinema, popular culture and digital texts.",
    color: "terracotta",
    keywords: ["film", "cinema", "adaptation", "media", "digital", "social media", "screen", "ott", "graphic novel", "comics", "popular culture", "internet", "web series", "artificial intelligence"],
  },
];
