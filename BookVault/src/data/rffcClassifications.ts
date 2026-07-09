// AUTO-GENERATED from RFFC-v4-comprehensive.md — do not edit by hand.
// Regenerate with:  node scripts/generate-rffc.js
// RFFC v4.0: 10 classes, 87 divisions, 470 sections, 8 suffixes, 20 tags
// (RFFC "division"/"section" = app Section/Division; see scripts/generate-rffc.js)

export type SeedDivision = { code: string; name: string };
export type SeedSection = { code: string; name: string; divisions: SeedDivision[] };
export type SeedMainClass = { code: string; name: string; sections: SeedSection[] };
export type SeedSuffix = { code: string; meaning: string; short: string };

export const RFFC_VERSION = "4.0";

// Level 4a — form & audience suffixes (a copy takes at most one)
export const RFFC_SUFFIXES: SeedSuffix[] = [
  {
    "code": "–a",
    "meaning": "Multi-author anthology / collection",
    "short": "Multi-author anthology"
  },
  {
    "code": "–s",
    "meaning": "Single-author short story collection",
    "short": "Single-author short story collection"
  },
  {
    "code": "–g",
    "meaning": "Graphic novel, comic, or manga format",
    "short": "Graphic novel"
  },
  {
    "code": "–j",
    "meaning": "Juvenile / middle grade audience",
    "short": "Juvenile"
  },
  {
    "code": "–y",
    "meaning": "Young adult audience",
    "short": "Young adult audience"
  },
  {
    "code": "–o",
    "meaning": "Oversized / coffee-table format",
    "short": "Oversized"
  },
  {
    "code": "–r",
    "meaning": "Reference format (consulted, not read through)",
    "short": "Reference format"
  },
  {
    "code": "–x",
    "meaning": "Local or personal association (signed, family, local author)",
    "short": "Local or personal association"
  }
];

// Level 4b — core cross-genre tag vocabulary (extend freely)
export const RFFC_TAGS: string[] = [
  "literary",
  "scifi",
  "fantasy",
  "mystery",
  "thriller",
  "romance",
  "horror",
  "history",
  "science",
  "religion",
  "myth",
  "poetry",
  "humor",
  "war",
  "sports",
  "gaming",
  "western",
  "dystopia",
  "sweet",
  "steamy"
];

export const RFFC_CLASSIFICATIONS: SeedMainClass[] = [
  {
    "code": "000",
    "name": "Reference & General Nonfiction",
    "sections": [
      {
        "code": "000.10",
        "name": "Language & Dictionaries",
        "divisions": [
          {
            "code": "000.10.01",
            "name": "English dictionaries"
          },
          {
            "code": "000.10.02",
            "name": "Thesauri & synonym finders"
          },
          {
            "code": "000.10.03",
            "name": "Foreign-language dictionaries & phrasebooks"
          },
          {
            "code": "000.10.04",
            "name": "Language learning & grammar"
          },
          {
            "code": "000.10.05",
            "name": "Etymology & word histories"
          },
          {
            "code": "000.10.06",
            "name": "Usage & style guides"
          },
          {
            "code": "000.10.07",
            "name": "Slang, idiom & regional English"
          },
          {
            "code": "000.10.08",
            "name": "Popular linguistics"
          }
        ]
      },
      {
        "code": "000.20",
        "name": "General Reference",
        "divisions": [
          {
            "code": "000.20.01",
            "name": "Encyclopedias"
          },
          {
            "code": "000.20.02",
            "name": "Almanacs & yearbooks"
          },
          {
            "code": "000.20.03",
            "name": "Atlases & general map books"
          },
          {
            "code": "000.20.04",
            "name": "Chronologies & timelines"
          },
          {
            "code": "000.20.05",
            "name": "Quotation collections"
          },
          {
            "code": "000.20.06",
            "name": "Trivia, facts & records"
          }
        ]
      },
      {
        "code": "000.30",
        "name": "Writing & Publishing",
        "divisions": [
          {
            "code": "000.30.01",
            "name": "Writing craft (general)"
          },
          {
            "code": "000.30.02",
            "name": "Fiction technique & genre craft"
          },
          {
            "code": "000.30.03",
            "name": "Nonfiction, memoir & essay craft"
          },
          {
            "code": "000.30.04",
            "name": "Screen & script writing craft"
          },
          {
            "code": "000.30.05",
            "name": "Publishing, self-publishing & the trade"
          },
          {
            "code": "000.30.06",
            "name": "Editing & grammar for writers"
          },
          {
            "code": "000.30.07",
            "name": "Authors on writing (essays & interviews)"
          }
        ]
      },
      {
        "code": "000.40",
        "name": "Literary Criticism & the Reading Life",
        "divisions": [
          {
            "code": "000.40.01",
            "name": "Criticism & literary theory"
          },
          {
            "code": "000.40.02",
            "name": "Genre studies"
          },
          {
            "code": "000.40.03",
            "name": "Reader's guides & companions to specific works"
          },
          {
            "code": "000.40.04",
            "name": "Books about reading & book lists"
          },
          {
            "code": "000.40.05",
            "name": "History of the book & printing"
          }
        ]
      },
      {
        "code": "000.50",
        "name": "Library & Collection Science",
        "divisions": [
          {
            "code": "000.50.01",
            "name": "Cataloging & classification"
          },
          {
            "code": "000.50.02",
            "name": "Collection care & conservation"
          },
          {
            "code": "000.50.03",
            "name": "Personal library management"
          },
          {
            "code": "000.50.04",
            "name": "Bibliographies & published catalogs"
          }
        ]
      },
      {
        "code": "000.60",
        "name": "Practical Life",
        "divisions": [
          {
            "code": "000.60.01",
            "name": "Self-help & personal development"
          },
          {
            "code": "000.60.02",
            "name": "Productivity, habits & time management"
          },
          {
            "code": "000.60.03",
            "name": "Personal finance & money"
          },
          {
            "code": "000.60.04",
            "name": "Career, business & leadership"
          },
          {
            "code": "000.60.05",
            "name": "Parenting & family life"
          },
          {
            "code": "000.60.06",
            "name": "Relationships & communication"
          },
          {
            "code": "000.60.07",
            "name": "Etiquette & life skills"
          },
          {
            "code": "000.60.08",
            "name": "Travel guides & practical travel"
          }
        ]
      }
    ]
  },
  {
    "code": "100",
    "name": "Literary & General Fiction",
    "sections": [
      {
        "code": "100.10",
        "name": "Contemporary Literary Fiction",
        "divisions": [
          {
            "code": "100.10.01",
            "name": "Character studies & domestic fiction"
          },
          {
            "code": "100.10.02",
            "name": "Social novels & state-of-the-world fiction"
          },
          {
            "code": "100.10.03",
            "name": "Experimental & unconventional narrative"
          },
          {
            "code": "100.10.04",
            "name": "Autofiction & fictionalized memoir"
          },
          {
            "code": "100.10.05",
            "name": "Campus, artist & writer novels"
          },
          {
            "code": "100.10.06",
            "name": "Grief, illness & interior-crisis fiction"
          },
          {
            "code": "100.10.07",
            "name": "Literary suspense"
          }
        ]
      },
      {
        "code": "100.20",
        "name": "Classics & Canon",
        "divisions": [
          {
            "code": "100.20.01",
            "name": "Ancient & classical literature"
          },
          {
            "code": "100.20.02",
            "name": "Medieval literature"
          },
          {
            "code": "100.20.03",
            "name": "16th–17th century"
          },
          {
            "code": "100.20.04",
            "name": "18th century"
          },
          {
            "code": "100.20.05",
            "name": "19th-century British"
          },
          {
            "code": "100.20.06",
            "name": "19th-century American"
          },
          {
            "code": "100.20.07",
            "name": "19th-century European & Russian"
          },
          {
            "code": "100.20.08",
            "name": "Modernism (1900–1945)"
          },
          {
            "code": "100.20.09",
            "name": "Mid-century (1945–1970)"
          }
        ]
      },
      {
        "code": "100.30",
        "name": "Historical Fiction",
        "divisions": [
          {
            "code": "100.30.01",
            "name": "Prehistoric & ancient world"
          },
          {
            "code": "100.30.02",
            "name": "Classical Greece & Rome"
          },
          {
            "code": "100.30.03",
            "name": "Medieval"
          },
          {
            "code": "100.30.04",
            "name": "Renaissance & early modern"
          },
          {
            "code": "100.30.05",
            "name": "18th century"
          },
          {
            "code": "100.30.06",
            "name": "19th century"
          },
          {
            "code": "100.30.07",
            "name": "World War I era"
          },
          {
            "code": "100.30.08",
            "name": "World War II era"
          },
          {
            "code": "100.30.09",
            "name": "Postwar 20th century"
          },
          {
            "code": "100.30.10",
            "name": "Biographical fiction (real historical figures)"
          }
        ]
      },
      {
        "code": "100.40",
        "name": "Mainstream & Popular Fiction",
        "divisions": [
          {
            "code": "100.40.01",
            "name": "Contemporary drama & relationships"
          },
          {
            "code": "100.40.02",
            "name": "Coming-of-age"
          },
          {
            "code": "100.40.03",
            "name": "Small-town & regional fiction"
          },
          {
            "code": "100.40.04",
            "name": "Workplace & profession fiction"
          },
          {
            "code": "100.40.05",
            "name": "Issue-driven & book-club fiction"
          },
          {
            "code": "100.40.06",
            "name": "Light fiction & beach reads"
          }
        ]
      },
      {
        "code": "100.50",
        "name": "Humor & Satire",
        "divisions": [
          {
            "code": "100.50.01",
            "name": "Comic novels"
          },
          {
            "code": "100.50.02",
            "name": "Satire & parody"
          },
          {
            "code": "100.50.03",
            "name": "Absurdist fiction"
          },
          {
            "code": "100.50.04",
            "name": "Humorous sketches & short pieces"
          }
        ]
      },
      {
        "code": "100.60",
        "name": "Adventure & Westerns",
        "divisions": [
          {
            "code": "100.60.01",
            "name": "Classic westerns"
          },
          {
            "code": "100.60.02",
            "name": "Modern & literary westerns"
          },
          {
            "code": "100.60.03",
            "name": "Sea stories & nautical fiction"
          },
          {
            "code": "100.60.04",
            "name": "Survival & wilderness fiction"
          },
          {
            "code": "100.60.05",
            "name": "Expedition & exploration fiction"
          }
        ]
      },
      {
        "code": "100.70",
        "name": "Sagas & Epics",
        "divisions": [
          {
            "code": "100.70.01",
            "name": "Multigenerational family sagas"
          },
          {
            "code": "100.70.02",
            "name": "Immigrant & diaspora narratives"
          },
          {
            "code": "100.70.03",
            "name": "Rural & land-based sagas"
          }
        ]
      },
      {
        "code": "100.80",
        "name": "World Literature in Translation",
        "divisions": [
          {
            "code": "100.80.01",
            "name": "European"
          },
          {
            "code": "100.80.02",
            "name": "Latin American"
          },
          {
            "code": "100.80.03",
            "name": "African & Middle Eastern"
          },
          {
            "code": "100.80.04",
            "name": "Asian"
          },
          {
            "code": "100.80.05",
            "name": "Global mixed anthologies"
          }
        ]
      },
      {
        "code": "100.90",
        "name": "Literary Collections & Short Forms",
        "divisions": [
          {
            "code": "100.90.01",
            "name": "Single-author story collections"
          },
          {
            "code": "100.90.02",
            "name": "Multi-author anthologies"
          },
          {
            "code": "100.90.03",
            "name": "Novellas & short novels"
          },
          {
            "code": "100.90.04",
            "name": "Flash & micro fiction"
          }
        ]
      }
    ]
  },
  {
    "code": "200",
    "name": "Sci-Fi & Fantasy",
    "sections": [
      {
        "code": "200.10",
        "name": "Space & Hard SF",
        "divisions": [
          {
            "code": "200.10.01",
            "name": "Space opera & galactic civilizations"
          },
          {
            "code": "200.10.02",
            "name": "Hard SF & engineering futures"
          },
          {
            "code": "200.10.03",
            "name": "First contact & alien encounter"
          },
          {
            "code": "200.10.04",
            "name": "Military SF"
          },
          {
            "code": "200.10.05",
            "name": "Exploration & colonization"
          },
          {
            "code": "200.10.06",
            "name": "Generation ships & deep time"
          },
          {
            "code": "200.10.07",
            "name": "Near space & solar-system fiction"
          }
        ]
      },
      {
        "code": "200.20",
        "name": "Speculative & Social SF",
        "divisions": [
          {
            "code": "200.20.01",
            "name": "Dystopia"
          },
          {
            "code": "200.20.02",
            "name": "Post-apocalyptic"
          },
          {
            "code": "200.20.03",
            "name": "Cyberpunk"
          },
          {
            "code": "200.20.04",
            "name": "AI & robot fiction"
          },
          {
            "code": "200.20.05",
            "name": "Time travel"
          },
          {
            "code": "200.20.06",
            "name": "Alternate history"
          },
          {
            "code": "200.20.07",
            "name": "Climate fiction"
          },
          {
            "code": "200.20.08",
            "name": "Biopunk & genetic futures"
          },
          {
            "code": "200.20.09",
            "name": "Social thought experiments & utopias"
          }
        ]
      },
      {
        "code": "200.30",
        "name": "Epic & High Fantasy",
        "divisions": [
          {
            "code": "200.30.01",
            "name": "Epic quests & secondary worlds"
          },
          {
            "code": "200.30.02",
            "name": "Political & courtly fantasy"
          },
          {
            "code": "200.30.03",
            "name": "Mythic & legend-retelling fantasy"
          },
          {
            "code": "200.30.04",
            "name": "Sword & sorcery"
          },
          {
            "code": "200.30.05",
            "name": "Grimdark & morally gray epics"
          },
          {
            "code": "200.30.06",
            "name": "Flintlock & gunpowder fantasy"
          },
          {
            "code": "200.30.07",
            "name": "Dragon & beast-bond fantasy"
          }
        ]
      },
      {
        "code": "200.40",
        "name": "Contemporary, Urban & Portal Fantasy",
        "divisions": [
          {
            "code": "200.40.01",
            "name": "Urban fantasy"
          },
          {
            "code": "200.40.02",
            "name": "Portal & crossover fantasy"
          },
          {
            "code": "200.40.03",
            "name": "Magical realism & fabulism"
          },
          {
            "code": "200.40.04",
            "name": "Fairy-tale retellings"
          },
          {
            "code": "200.40.05",
            "name": "Cozy & comfort fantasy"
          },
          {
            "code": "200.40.06",
            "name": "Paranormal contemporary (non-romance)"
          },
          {
            "code": "200.40.07",
            "name": "Slipstream & interstitial"
          }
        ]
      },
      {
        "code": "200.50",
        "name": "Historical & Gaslamp Fantasy",
        "divisions": [
          {
            "code": "200.50.01",
            "name": "Historical fantasy (real past + magic)"
          },
          {
            "code": "200.50.02",
            "name": "Gaslamp & Victorian fantasy"
          },
          {
            "code": "200.50.03",
            "name": "Steampunk"
          },
          {
            "code": "200.50.04",
            "name": "Weird west"
          },
          {
            "code": "200.50.05",
            "name": "Arthurian & legend-cycle fiction"
          }
        ]
      },
      {
        "code": "200.60",
        "name": "Gaming & Shared Worlds",
        "divisions": [
          {
            "code": "200.60.01",
            "name": "LitRPG"
          },
          {
            "code": "200.60.02",
            "name": "Progression & cultivation fantasy"
          },
          {
            "code": "200.60.03",
            "name": "TTRPG tie-in fiction (D&D, Pathfinder, etc.)"
          },
          {
            "code": "200.60.04",
            "name": "Video game tie-in fiction"
          },
          {
            "code": "200.60.05",
            "name": "Franchise SF (Star Wars, Star Trek, etc.)"
          },
          {
            "code": "200.60.06",
            "name": "Franchise fantasy & grim futures (Warhammer, etc.)"
          }
        ]
      },
      {
        "code": "200.70",
        "name": "Humorous & Light SF/F",
        "divisions": [
          {
            "code": "200.70.01",
            "name": "Comic fantasy"
          },
          {
            "code": "200.70.02",
            "name": "Comic science fiction"
          },
          {
            "code": "200.70.03",
            "name": "Satirical speculative fiction"
          }
        ]
      },
      {
        "code": "200.80",
        "name": "Superhero & Media-Born Fiction",
        "divisions": [
          {
            "code": "200.80.01",
            "name": "Superhero prose fiction"
          },
          {
            "code": "200.80.02",
            "name": "Kaiju & mecha fiction"
          },
          {
            "code": "200.80.03",
            "name": "Film & TV novelizations (speculative)"
          }
        ]
      },
      {
        "code": "200.90",
        "name": "SF/F Collections",
        "divisions": [
          {
            "code": "200.90.01",
            "name": "Single-author SF collections"
          },
          {
            "code": "200.90.02",
            "name": "Single-author fantasy collections"
          },
          {
            "code": "200.90.03",
            "name": "Themed anthologies"
          },
          {
            "code": "200.90.04",
            "name": "Year's-best & award annuals"
          }
        ]
      }
    ]
  },
  {
    "code": "300",
    "name": "Mystery, Thriller & Crime",
    "sections": [
      {
        "code": "300.10",
        "name": "Detective Fiction",
        "divisions": [
          {
            "code": "300.10.01",
            "name": "Golden-age & classic detection"
          },
          {
            "code": "300.10.02",
            "name": "Private investigators"
          },
          {
            "code": "300.10.03",
            "name": "Police procedurals"
          },
          {
            "code": "300.10.04",
            "name": "Amateur sleuths"
          },
          {
            "code": "300.10.05",
            "name": "Forensic & crime-scene fiction"
          },
          {
            "code": "300.10.06",
            "name": "International & translated crime fiction"
          }
        ]
      },
      {
        "code": "300.20",
        "name": "Cozy Mystery",
        "divisions": [
          {
            "code": "300.20.01",
            "name": "Craft & hobby cozies"
          },
          {
            "code": "300.20.02",
            "name": "Culinary cozies"
          },
          {
            "code": "300.20.03",
            "name": "Animal & pet cozies"
          },
          {
            "code": "300.20.04",
            "name": "Bookshop & library cozies"
          },
          {
            "code": "300.20.05",
            "name": "Small-town series cozies"
          },
          {
            "code": "300.20.06",
            "name": "Paranormal cozies"
          },
          {
            "code": "300.20.07",
            "name": "Holiday & seasonal cozies"
          }
        ]
      },
      {
        "code": "300.30",
        "name": "Psychological & Domestic Thrillers",
        "divisions": [
          {
            "code": "300.30.01",
            "name": "Psychological thrillers"
          },
          {
            "code": "300.30.02",
            "name": "Domestic thrillers"
          },
          {
            "code": "300.30.03",
            "name": "Unreliable-narrator thrillers"
          },
          {
            "code": "300.30.04",
            "name": "Stalker & obsession"
          },
          {
            "code": "300.30.05",
            "name": "Missing persons & amnesia"
          }
        ]
      },
      {
        "code": "300.40",
        "name": "Action, Spy & Political Thrillers",
        "divisions": [
          {
            "code": "300.40.01",
            "name": "Espionage"
          },
          {
            "code": "300.40.02",
            "name": "Political & conspiracy thrillers"
          },
          {
            "code": "300.40.03",
            "name": "Techno-thrillers"
          },
          {
            "code": "300.40.04",
            "name": "Action & adventure thrillers"
          },
          {
            "code": "300.40.05",
            "name": "Assassin & vigilante fiction"
          },
          {
            "code": "300.40.06",
            "name": "Disaster & survival thrillers"
          }
        ]
      },
      {
        "code": "300.50",
        "name": "Crime & Noir",
        "divisions": [
          {
            "code": "300.50.01",
            "name": "Noir & hardboiled"
          },
          {
            "code": "300.50.02",
            "name": "Heists & capers"
          },
          {
            "code": "300.50.03",
            "name": "Organized crime fiction"
          },
          {
            "code": "300.50.04",
            "name": "Rural & country noir"
          },
          {
            "code": "300.50.05",
            "name": "Prison & aftermath fiction"
          }
        ]
      },
      {
        "code": "300.60",
        "name": "Legal, Medical & Specialty Thrillers",
        "divisions": [
          {
            "code": "300.60.01",
            "name": "Legal & courtroom"
          },
          {
            "code": "300.60.02",
            "name": "Medical thrillers"
          },
          {
            "code": "300.60.03",
            "name": "Journalism & media thrillers"
          },
          {
            "code": "300.60.04",
            "name": "Financial & corporate thrillers"
          }
        ]
      },
      {
        "code": "300.70",
        "name": "Historical Mystery & Crime",
        "divisions": [
          {
            "code": "300.70.01",
            "name": "Ancient & medieval sleuths"
          },
          {
            "code": "300.70.02",
            "name": "Victorian & Edwardian mysteries"
          },
          {
            "code": "300.70.03",
            "name": "20th-century historical mysteries"
          },
          {
            "code": "300.70.04",
            "name": "Historical noir"
          }
        ]
      },
      {
        "code": "300.80",
        "name": "True Crime",
        "divisions": [
          {
            "code": "300.80.01",
            "name": "Case studies & investigations"
          },
          {
            "code": "300.80.02",
            "name": "Serial crime & criminal profiling"
          },
          {
            "code": "300.80.03",
            "name": "Cold cases & historical crimes"
          },
          {
            "code": "300.80.04",
            "name": "Heists, fraud & white-collar crime"
          },
          {
            "code": "300.80.05",
            "name": "Justice, wrongful conviction & the courts"
          },
          {
            "code": "300.80.06",
            "name": "Organized crime (nonfiction)"
          },
          {
            "code": "300.80.07",
            "name": "Forensics & investigation (nonfiction)"
          }
        ]
      },
      {
        "code": "300.90",
        "name": "Mystery & Crime Collections",
        "divisions": [
          {
            "code": "300.90.01",
            "name": "Single-author collections"
          },
          {
            "code": "300.90.02",
            "name": "Multi-author anthologies"
          }
        ]
      }
    ]
  },
  {
    "code": "400",
    "name": "Romance",
    "sections": [
      {
        "code": "400.10",
        "name": "Contemporary Romance",
        "divisions": [
          {
            "code": "400.10.01",
            "name": "Small-town & community"
          },
          {
            "code": "400.10.02",
            "name": "City & workplace"
          },
          {
            "code": "400.10.03",
            "name": "Sports romance"
          },
          {
            "code": "400.10.04",
            "name": "Billionaire & glamour"
          },
          {
            "code": "400.10.05",
            "name": "Second-chance & slow burn"
          },
          {
            "code": "400.10.06",
            "name": "Military & first-responder"
          },
          {
            "code": "400.10.07",
            "name": "Holiday & seasonal"
          }
        ]
      },
      {
        "code": "400.20",
        "name": "Historical Romance",
        "divisions": [
          {
            "code": "400.20.01",
            "name": "Regency"
          },
          {
            "code": "400.20.02",
            "name": "Victorian & Edwardian"
          },
          {
            "code": "400.20.03",
            "name": "Medieval & Highland"
          },
          {
            "code": "400.20.04",
            "name": "American & western romance"
          },
          {
            "code": "400.20.05",
            "name": "20th-century historical"
          },
          {
            "code": "400.20.06",
            "name": "Pirate & seafaring romance"
          }
        ]
      },
      {
        "code": "400.30",
        "name": "Romantasy & Paranormal Romance",
        "divisions": [
          {
            "code": "400.30.01",
            "name": "Fae & fantasy-court romance"
          },
          {
            "code": "400.30.02",
            "name": "Gods & mythology romance"
          },
          {
            "code": "400.30.03",
            "name": "Vampire & shifter romance"
          },
          {
            "code": "400.30.04",
            "name": "Monster romance"
          },
          {
            "code": "400.30.05",
            "name": "Witches & magic romance"
          },
          {
            "code": "400.30.06",
            "name": "Sci-fi & alien romance"
          },
          {
            "code": "400.30.07",
            "name": "Ghost & time-slip romance"
          }
        ]
      },
      {
        "code": "400.40",
        "name": "Romantic Suspense",
        "divisions": [
          {
            "code": "400.40.01",
            "name": "Protection & danger plots"
          },
          {
            "code": "400.40.02",
            "name": "Crime-adjacent romance"
          },
          {
            "code": "400.40.03",
            "name": "Military & special-ops suspense"
          }
        ]
      },
      {
        "code": "400.50",
        "name": "Romantic Comedy",
        "divisions": [
          {
            "code": "400.50.01",
            "name": "Classic rom-com tropes"
          },
          {
            "code": "400.50.02",
            "name": "Screwball & farce"
          },
          {
            "code": "400.50.03",
            "name": "Celebrity & fame rom-coms"
          }
        ]
      },
      {
        "code": "400.60",
        "name": "Sweet & Inspirational Romance",
        "divisions": [
          {
            "code": "400.60.01",
            "name": "Sweet & clean contemporary"
          },
          {
            "code": "400.60.02",
            "name": "Inspirational & faith-based"
          },
          {
            "code": "400.60.03",
            "name": "Amish & close-community romance"
          }
        ]
      },
      {
        "code": "400.70",
        "name": "High-Heat & Dark Romance",
        "divisions": [
          {
            "code": "400.70.01",
            "name": "Erotic contemporary"
          },
          {
            "code": "400.70.02",
            "name": "Erotic historical & paranormal"
          },
          {
            "code": "400.70.03",
            "name": "Dark romance"
          }
        ]
      },
      {
        "code": "400.80",
        "name": "Relationship Fiction",
        "divisions": [
          {
            "code": "400.80.01",
            "name": "Women's fiction with a romance spine"
          },
          {
            "code": "400.80.02",
            "name": "Marriage & second-act stories"
          },
          {
            "code": "400.80.03",
            "name": "Friendship ensembles with romantic threads"
          }
        ]
      },
      {
        "code": "400.90",
        "name": "Romance Collections",
        "divisions": [
          {
            "code": "400.90.01",
            "name": "Novella collections & duets"
          },
          {
            "code": "400.90.02",
            "name": "Multi-author anthologies"
          }
        ]
      }
    ]
  },
  {
    "code": "500",
    "name": "Horror",
    "sections": [
      {
        "code": "500.10",
        "name": "Supernatural Horror",
        "divisions": [
          {
            "code": "500.10.01",
            "name": "Ghosts & hauntings"
          },
          {
            "code": "500.10.02",
            "name": "Haunted houses & places"
          },
          {
            "code": "500.10.03",
            "name": "Demonic & possession"
          },
          {
            "code": "500.10.04",
            "name": "Curses & witchcraft"
          },
          {
            "code": "500.10.05",
            "name": "Death & the afterlife"
          }
        ]
      },
      {
        "code": "500.20",
        "name": "Monster Horror",
        "divisions": [
          {
            "code": "500.20.01",
            "name": "Vampires"
          },
          {
            "code": "500.20.02",
            "name": "Werewolves & shapeshifters"
          },
          {
            "code": "500.20.03",
            "name": "Zombies & the undead"
          },
          {
            "code": "500.20.04",
            "name": "Creatures & cryptids"
          },
          {
            "code": "500.20.05",
            "name": "Sea & deep-water horror"
          },
          {
            "code": "500.20.06",
            "name": "Giant monsters & eco-horror"
          }
        ]
      },
      {
        "code": "500.30",
        "name": "Psychological & Literary Horror",
        "divisions": [
          {
            "code": "500.30.01",
            "name": "Psychological horror"
          },
          {
            "code": "500.30.02",
            "name": "Literary & elevated horror"
          },
          {
            "code": "500.30.03",
            "name": "Body horror"
          },
          {
            "code": "500.30.04",
            "name": "Isolation & confinement horror"
          },
          {
            "code": "500.30.05",
            "name": "Grief & domestic horror"
          }
        ]
      },
      {
        "code": "500.40",
        "name": "Cosmic & Weird",
        "divisions": [
          {
            "code": "500.40.01",
            "name": "Lovecraftian & cosmic dread"
          },
          {
            "code": "500.40.02",
            "name": "Weird fiction & the New Weird"
          },
          {
            "code": "500.40.03",
            "name": "Reality & existential horror"
          },
          {
            "code": "500.40.04",
            "name": "Found-footage & analog-style narratives"
          }
        ]
      },
      {
        "code": "500.50",
        "name": "Gothic",
        "divisions": [
          {
            "code": "500.50.01",
            "name": "Classic gothic (18th–19th century)"
          },
          {
            "code": "500.50.02",
            "name": "Southern gothic"
          },
          {
            "code": "500.50.03",
            "name": "Modern gothic revival"
          }
        ]
      },
      {
        "code": "500.60",
        "name": "Folk & Occult Horror",
        "divisions": [
          {
            "code": "500.60.01",
            "name": "Folk horror"
          },
          {
            "code": "500.60.02",
            "name": "Occult & ritual horror"
          },
          {
            "code": "500.60.03",
            "name": "Religious horror"
          }
        ]
      },
      {
        "code": "500.70",
        "name": "Extreme & Slasher",
        "divisions": [
          {
            "code": "500.70.01",
            "name": "Slasher & survival horror"
          },
          {
            "code": "500.70.02",
            "name": "Splatterpunk & extreme horror"
          },
          {
            "code": "500.70.03",
            "name": "Serial-killer horror"
          }
        ]
      },
      {
        "code": "500.80",
        "name": "Techno & Apocalyptic Horror",
        "divisions": [
          {
            "code": "500.80.01",
            "name": "Techno-horror & hostile AI"
          },
          {
            "code": "500.80.02",
            "name": "Pandemic & outbreak horror"
          },
          {
            "code": "500.80.03",
            "name": "Apocalyptic horror"
          },
          {
            "code": "500.80.04",
            "name": "Space horror"
          }
        ]
      },
      {
        "code": "500.90",
        "name": "Horror Collections",
        "divisions": [
          {
            "code": "500.90.01",
            "name": "Single-author collections"
          },
          {
            "code": "500.90.02",
            "name": "Multi-author & themed anthologies"
          }
        ]
      }
    ]
  },
  {
    "code": "600",
    "name": "History & Biography",
    "sections": [
      {
        "code": "600.10",
        "name": "Ancient World",
        "divisions": [
          {
            "code": "600.10.01",
            "name": "Prehistory & human origins"
          },
          {
            "code": "600.10.02",
            "name": "Egypt & the Near East"
          },
          {
            "code": "600.10.03",
            "name": "Ancient Greece"
          },
          {
            "code": "600.10.04",
            "name": "Ancient Rome"
          },
          {
            "code": "600.10.05",
            "name": "Ancient Asia & the Americas"
          }
        ]
      },
      {
        "code": "600.20",
        "name": "Medieval & Early Modern World",
        "divisions": [
          {
            "code": "600.20.01",
            "name": "Medieval Europe"
          },
          {
            "code": "600.20.02",
            "name": "Byzantium & the medieval Islamic world"
          },
          {
            "code": "600.20.03",
            "name": "Renaissance"
          },
          {
            "code": "600.20.04",
            "name": "Age of exploration"
          },
          {
            "code": "600.20.05",
            "name": "Early modern empires (1500–1800)"
          }
        ]
      },
      {
        "code": "600.30",
        "name": "Modern World",
        "divisions": [
          {
            "code": "600.30.01",
            "name": "Revolutionary & Napoleonic era"
          },
          {
            "code": "600.30.02",
            "name": "19th-century world"
          },
          {
            "code": "600.30.03",
            "name": "Early 20th century"
          },
          {
            "code": "600.30.04",
            "name": "Cold War era"
          },
          {
            "code": "600.30.05",
            "name": "Contemporary history (1990–present)"
          }
        ]
      },
      {
        "code": "600.40",
        "name": "American History",
        "divisions": [
          {
            "code": "600.40.01",
            "name": "Colonial & Revolutionary"
          },
          {
            "code": "600.40.02",
            "name": "Early republic & antebellum"
          },
          {
            "code": "600.40.03",
            "name": "Civil War & Reconstruction (political & social)"
          },
          {
            "code": "600.40.04",
            "name": "Frontier & the West"
          },
          {
            "code": "600.40.05",
            "name": "Gilded Age & Progressive era"
          },
          {
            "code": "600.40.06",
            "name": "20th-century America"
          },
          {
            "code": "600.40.07",
            "name": "The South (regional history)"
          },
          {
            "code": "600.40.08",
            "name": "State & local history"
          }
        ]
      },
      {
        "code": "600.50",
        "name": "Military History",
        "divisions": [
          {
            "code": "600.50.01",
            "name": "Warfare, strategy & general military history"
          },
          {
            "code": "600.50.02",
            "name": "Ancient & medieval warfare"
          },
          {
            "code": "600.50.03",
            "name": "Early modern warfare"
          },
          {
            "code": "600.50.04",
            "name": "American Civil War (military)"
          },
          {
            "code": "600.50.05",
            "name": "World War I"
          },
          {
            "code": "600.50.06",
            "name": "World War II — Europe & Atlantic"
          },
          {
            "code": "600.50.07",
            "name": "World War II — Pacific"
          },
          {
            "code": "600.50.08",
            "name": "Modern conflicts (1945–present)"
          },
          {
            "code": "600.50.09",
            "name": "Units, weapons & equipment"
          }
        ]
      },
      {
        "code": "600.60",
        "name": "Biography & Memoir",
        "divisions": [
          {
            "code": "600.60.01",
            "name": "Political & national leaders"
          },
          {
            "code": "600.60.02",
            "name": "Military figures"
          },
          {
            "code": "600.60.03",
            "name": "Writers, artists & performers"
          },
          {
            "code": "600.60.04",
            "name": "Scientists & innovators"
          },
          {
            "code": "600.60.05",
            "name": "Business & industry figures"
          },
          {
            "code": "600.60.06",
            "name": "Athletes & sports figures"
          },
          {
            "code": "600.60.07",
            "name": "Group biographies & ordinary lives"
          },
          {
            "code": "600.60.08",
            "name": "Memoir & personal narrative"
          },
          {
            "code": "600.60.09",
            "name": "Diaries, letters & primary lives"
          }
        ]
      },
      {
        "code": "600.70",
        "name": "Social & Cultural History",
        "divisions": [
          {
            "code": "600.70.01",
            "name": "Daily life & material culture"
          },
          {
            "code": "600.70.02",
            "name": "Food & drink history"
          },
          {
            "code": "600.70.03",
            "name": "Social movements & change"
          },
          {
            "code": "600.70.04",
            "name": "Microhistories (one object, commodity, or idea)"
          },
          {
            "code": "600.70.05",
            "name": "Disasters & accidents (narrative history)"
          },
          {
            "code": "600.70.06",
            "name": "Espionage & intelligence history"
          }
        ]
      },
      {
        "code": "600.80",
        "name": "World Regions (national & regional histories)",
        "divisions": [
          {
            "code": "600.80.01",
            "name": "Britain & Ireland"
          },
          {
            "code": "600.80.02",
            "name": "Western & Central Europe"
          },
          {
            "code": "600.80.03",
            "name": "Russia & Eastern Europe"
          },
          {
            "code": "600.80.04",
            "name": "Middle East"
          },
          {
            "code": "600.80.05",
            "name": "Africa"
          },
          {
            "code": "600.80.06",
            "name": "Asia"
          },
          {
            "code": "600.80.07",
            "name": "Latin America & the Caribbean"
          },
          {
            "code": "600.80.08",
            "name": "Oceania & the polar regions"
          }
        ]
      },
      {
        "code": "600.90",
        "name": "Historiography & Method",
        "divisions": [
          {
            "code": "600.90.01",
            "name": "How history is written & remembered"
          },
          {
            "code": "600.90.02",
            "name": "Archaeology (the discipline)"
          },
          {
            "code": "600.90.03",
            "name": "Genealogy & family research"
          },
          {
            "code": "600.90.04",
            "name": "Historical atlases & reference"
          }
        ]
      }
    ]
  },
  {
    "code": "700",
    "name": "Science & Nature",
    "sections": [
      {
        "code": "700.10",
        "name": "Physics & the Universe",
        "divisions": [
          {
            "code": "700.10.01",
            "name": "General & popular physics"
          },
          {
            "code": "700.10.02",
            "name": "Quantum physics"
          },
          {
            "code": "700.10.03",
            "name": "Relativity, cosmology & origins"
          },
          {
            "code": "700.10.04",
            "name": "Particle physics"
          },
          {
            "code": "700.10.05",
            "name": "Chemistry & the elements"
          }
        ]
      },
      {
        "code": "700.20",
        "name": "Astronomy & Space",
        "divisions": [
          {
            "code": "700.20.01",
            "name": "General astronomy"
          },
          {
            "code": "700.20.02",
            "name": "The solar system & planets"
          },
          {
            "code": "700.20.03",
            "name": "Stars, galaxies & deep space"
          },
          {
            "code": "700.20.04",
            "name": "Spaceflight & exploration"
          },
          {
            "code": "700.20.05",
            "name": "Amateur astronomy & observing"
          }
        ]
      },
      {
        "code": "700.30",
        "name": "Life Sciences",
        "divisions": [
          {
            "code": "700.30.01",
            "name": "Evolution"
          },
          {
            "code": "700.30.02",
            "name": "Genetics & DNA"
          },
          {
            "code": "700.30.03",
            "name": "Microbiology & viruses"
          },
          {
            "code": "700.30.04",
            "name": "Zoology & animal behavior"
          },
          {
            "code": "700.30.05",
            "name": "Marine life"
          },
          {
            "code": "700.30.06",
            "name": "Insects & invertebrates"
          },
          {
            "code": "700.30.07",
            "name": "Botany & plant science"
          },
          {
            "code": "700.30.08",
            "name": "Paleontology & dinosaurs"
          }
        ]
      },
      {
        "code": "700.40",
        "name": "Nature & the Outdoors",
        "divisions": [
          {
            "code": "700.40.01",
            "name": "Nature writing & essays"
          },
          {
            "code": "700.40.02",
            "name": "Birds & birding"
          },
          {
            "code": "700.40.03",
            "name": "Field guides — plants & fungi"
          },
          {
            "code": "700.40.04",
            "name": "Field guides — animals"
          },
          {
            "code": "700.40.05",
            "name": "Hiking, camping & outdoor skills"
          },
          {
            "code": "700.40.06",
            "name": "Regional natural history"
          }
        ]
      },
      {
        "code": "700.50",
        "name": "Earth & Environment",
        "divisions": [
          {
            "code": "700.50.01",
            "name": "Geology & earth science"
          },
          {
            "code": "700.50.02",
            "name": "Weather & climate science"
          },
          {
            "code": "700.50.03",
            "name": "Climate change"
          },
          {
            "code": "700.50.04",
            "name": "Oceans & waterways"
          },
          {
            "code": "700.50.05",
            "name": "Ecology & conservation"
          },
          {
            "code": "700.50.06",
            "name": "Natural disasters (the science)"
          }
        ]
      },
      {
        "code": "700.60",
        "name": "Mathematics & Computing",
        "divisions": [
          {
            "code": "700.60.01",
            "name": "Popular mathematics"
          },
          {
            "code": "700.60.02",
            "name": "Statistics & probability"
          },
          {
            "code": "700.60.03",
            "name": "Mathematical logic & puzzles"
          },
          {
            "code": "700.60.04",
            "name": "Computing & software"
          },
          {
            "code": "700.60.05",
            "name": "AI & machine learning"
          },
          {
            "code": "700.60.06",
            "name": "The internet & digital society"
          }
        ]
      },
      {
        "code": "700.70",
        "name": "Engineering & Technology",
        "divisions": [
          {
            "code": "700.70.01",
            "name": "How things work"
          },
          {
            "code": "700.70.02",
            "name": "Invention & history of technology"
          },
          {
            "code": "700.70.03",
            "name": "Transportation & machines"
          },
          {
            "code": "700.70.04",
            "name": "Energy & infrastructure"
          },
          {
            "code": "700.70.05",
            "name": "Materials & manufacturing"
          }
        ]
      },
      {
        "code": "700.80",
        "name": "Medicine & the Body",
        "divisions": [
          {
            "code": "700.80.01",
            "name": "How the body works"
          },
          {
            "code": "700.80.02",
            "name": "Disease & epidemics"
          },
          {
            "code": "700.80.03",
            "name": "History of medicine"
          },
          {
            "code": "700.80.04",
            "name": "Nutrition & fitness science"
          },
          {
            "code": "700.80.05",
            "name": "Sleep, aging & longevity"
          },
          {
            "code": "700.80.06",
            "name": "Medical narratives & physician memoirs"
          }
        ]
      },
      {
        "code": "700.90",
        "name": "Mind & Behavior",
        "divisions": [
          {
            "code": "700.90.01",
            "name": "Neuroscience"
          },
          {
            "code": "700.90.02",
            "name": "Popular psychology"
          },
          {
            "code": "700.90.03",
            "name": "Decision-making & behavioral economics"
          },
          {
            "code": "700.90.04",
            "name": "Memory, learning & expertise"
          },
          {
            "code": "700.90.05",
            "name": "Consciousness & perception"
          },
          {
            "code": "700.90.06",
            "name": "Mental health (science-forward; memoir-forward → 600.60.08)"
          }
        ]
      }
    ]
  },
  {
    "code": "800",
    "name": "Religion, Mythology & Philosophy",
    "sections": [
      {
        "code": "800.10",
        "name": "Christianity",
        "divisions": [
          {
            "code": "800.10.01",
            "name": "Bibles & scripture editions"
          },
          {
            "code": "800.10.02",
            "name": "Biblical studies & commentary"
          },
          {
            "code": "800.10.03",
            "name": "Theology & doctrine"
          },
          {
            "code": "800.10.04",
            "name": "Christian living & devotional"
          },
          {
            "code": "800.10.05",
            "name": "Church history"
          },
          {
            "code": "800.10.06",
            "name": "Denominations & movements"
          },
          {
            "code": "800.10.07",
            "name": "Apologetics & belief debates"
          }
        ]
      },
      {
        "code": "800.20",
        "name": "Judaism & Islam",
        "divisions": [
          {
            "code": "800.20.01",
            "name": "Judaism — texts & thought"
          },
          {
            "code": "800.20.02",
            "name": "Judaism — practice & culture"
          },
          {
            "code": "800.20.03",
            "name": "Islam — texts & thought"
          },
          {
            "code": "800.20.04",
            "name": "Islam — practice & culture"
          }
        ]
      },
      {
        "code": "800.30",
        "name": "Eastern & Dharmic Traditions",
        "divisions": [
          {
            "code": "800.30.01",
            "name": "Buddhism"
          },
          {
            "code": "800.30.02",
            "name": "Hinduism"
          },
          {
            "code": "800.30.03",
            "name": "Taoism & Confucianism"
          },
          {
            "code": "800.30.04",
            "name": "Meditation & contemplative practice"
          }
        ]
      },
      {
        "code": "800.40",
        "name": "Comparative & Other Traditions",
        "divisions": [
          {
            "code": "800.40.01",
            "name": "Comparative religion"
          },
          {
            "code": "800.40.02",
            "name": "Indigenous & earth-based traditions"
          },
          {
            "code": "800.40.03",
            "name": "New religious movements"
          },
          {
            "code": "800.40.04",
            "name": "Atheism, secularism & religion debates"
          }
        ]
      },
      {
        "code": "800.50",
        "name": "Mythology",
        "divisions": [
          {
            "code": "800.50.01",
            "name": "Greek & Roman"
          },
          {
            "code": "800.50.02",
            "name": "Norse & Germanic"
          },
          {
            "code": "800.50.03",
            "name": "Celtic & British Isles"
          },
          {
            "code": "800.50.04",
            "name": "Egyptian & Near Eastern"
          },
          {
            "code": "800.50.05",
            "name": "Asian mythologies"
          },
          {
            "code": "800.50.06",
            "name": "African & African-diaspora"
          },
          {
            "code": "800.50.07",
            "name": "Mesoamerican & South American"
          },
          {
            "code": "800.50.08",
            "name": "North American & Arctic"
          },
          {
            "code": "800.50.09",
            "name": "Comparative myth & mythology reference"
          }
        ]
      },
      {
        "code": "800.60",
        "name": "Folklore & Legend",
        "divisions": [
          {
            "code": "800.60.01",
            "name": "Fairy tales (source collections)"
          },
          {
            "code": "800.60.02",
            "name": "World folktales"
          },
          {
            "code": "800.60.03",
            "name": "American folklore & tall tales"
          },
          {
            "code": "800.60.04",
            "name": "Urban legends"
          },
          {
            "code": "800.60.05",
            "name": "Legendary figures as subject (Arthur, Robin Hood)"
          }
        ]
      },
      {
        "code": "800.70",
        "name": "Philosophy",
        "divisions": [
          {
            "code": "800.70.01",
            "name": "Ancient & classical philosophy"
          },
          {
            "code": "800.70.02",
            "name": "Medieval & early modern"
          },
          {
            "code": "800.70.03",
            "name": "19th-century philosophy"
          },
          {
            "code": "800.70.04",
            "name": "20th-century & contemporary"
          },
          {
            "code": "800.70.05",
            "name": "Eastern philosophy"
          },
          {
            "code": "800.70.06",
            "name": "Popular philosophy & big questions"
          }
        ]
      },
      {
        "code": "800.80",
        "name": "Ethics, Meaning & Living Well",
        "divisions": [
          {
            "code": "800.80.01",
            "name": "Ethics & moral philosophy"
          },
          {
            "code": "800.80.02",
            "name": "Political & social philosophy"
          },
          {
            "code": "800.80.03",
            "name": "Death, meaning & metaphysics"
          },
          {
            "code": "800.80.04",
            "name": "Stoicism & applied life philosophy"
          }
        ]
      },
      {
        "code": "800.90",
        "name": "Occult & Esoterica (as subject)",
        "divisions": [
          {
            "code": "800.90.01",
            "name": "Occult history & traditions"
          },
          {
            "code": "800.90.02",
            "name": "Divination, tarot & astrology"
          },
          {
            "code": "800.90.03",
            "name": "The paranormal & unexplained"
          },
          {
            "code": "800.90.04",
            "name": "Magical practice & grimoires (as subject)"
          }
        ]
      }
    ]
  },
  {
    "code": "900",
    "name": "Poetry, Music, Art & Making",
    "sections": [
      {
        "code": "900.10",
        "name": "Poetry",
        "divisions": [
          {
            "code": "900.10.01",
            "name": "Contemporary single-poet collections"
          },
          {
            "code": "900.10.02",
            "name": "Classic & canonical poets"
          },
          {
            "code": "900.10.03",
            "name": "Anthologies & themed collections"
          },
          {
            "code": "900.10.04",
            "name": "Epic & narrative poetry"
          },
          {
            "code": "900.10.05",
            "name": "Poetry in translation"
          },
          {
            "code": "900.10.06",
            "name": "Poetics, forms & reading poetry"
          },
          {
            "code": "900.10.07",
            "name": "Light verse & occasional poetry"
          }
        ]
      },
      {
        "code": "900.20",
        "name": "Music",
        "divisions": [
          {
            "code": "900.20.01",
            "name": "Music history & genres"
          },
          {
            "code": "900.20.02",
            "name": "Musician biographies & band histories"
          },
          {
            "code": "900.20.03",
            "name": "Theory & composition"
          },
          {
            "code": "900.20.04",
            "name": "Instrument instruction & method books"
          },
          {
            "code": "900.20.05",
            "name": "Songbooks & sheet music"
          },
          {
            "code": "900.20.06",
            "name": "Recording, production & gear"
          }
        ]
      },
      {
        "code": "900.30",
        "name": "Visual Art",
        "divisions": [
          {
            "code": "900.30.01",
            "name": "Art history & movements"
          },
          {
            "code": "900.30.02",
            "name": "Artist monographs"
          },
          {
            "code": "900.30.03",
            "name": "Museum & collection catalogs"
          },
          {
            "code": "900.30.04",
            "name": "Drawing technique"
          },
          {
            "code": "900.30.05",
            "name": "Painting technique"
          },
          {
            "code": "900.30.06",
            "name": "Illustration & concept art"
          },
          {
            "code": "900.30.07",
            "name": "Comics & sequential art (about & how-to)"
          }
        ]
      },
      {
        "code": "900.40",
        "name": "Performing Arts",
        "divisions": [
          {
            "code": "900.40.01",
            "name": "Plays & drama (scripts)"
          },
          {
            "code": "900.40.02",
            "name": "Theater history & stagecraft"
          },
          {
            "code": "900.40.03",
            "name": "Film & television (about)"
          },
          {
            "code": "900.40.04",
            "name": "Screenplays (published)"
          },
          {
            "code": "900.40.05",
            "name": "Dance"
          },
          {
            "code": "900.40.06",
            "name": "Comedy & stand-up"
          }
        ]
      },
      {
        "code": "900.50",
        "name": "Craft & Making",
        "divisions": [
          {
            "code": "900.50.01",
            "name": "Woodworking & furniture making"
          },
          {
            "code": "900.50.02",
            "name": "Ceramics & glasswork"
          },
          {
            "code": "900.50.03",
            "name": "Textiles, weaving & fiber arts"
          },
          {
            "code": "900.50.04",
            "name": "Metalworking & jewelry"
          },
          {
            "code": "900.50.05",
            "name": "General craft & DIY"
          },
          {
            "code": "900.50.06",
            "name": "Cooking & baking"
          },
          {
            "code": "900.50.07",
            "name": "Practical gardening & homesteading"
          },
          {
            "code": "900.50.08",
            "name": "Brewing, fermentation & preserving"
          },
          {
            "code": "900.50.09",
            "name": "Home improvement & repair"
          }
        ]
      },
      {
        "code": "900.60",
        "name": "Design & Architecture",
        "divisions": [
          {
            "code": "900.60.01",
            "name": "Architecture"
          },
          {
            "code": "900.60.02",
            "name": "Interior & home design"
          },
          {
            "code": "900.60.03",
            "name": "Graphic design & typography"
          },
          {
            "code": "900.60.04",
            "name": "Industrial & product design"
          },
          {
            "code": "900.60.05",
            "name": "Fashion & costume"
          }
        ]
      },
      {
        "code": "900.70",
        "name": "Photography",
        "divisions": [
          {
            "code": "900.70.01",
            "name": "Photography history & monographs"
          },
          {
            "code": "900.70.02",
            "name": "Technique & instruction"
          },
          {
            "code": "900.70.03",
            "name": "Photojournalism & photo essays"
          }
        ]
      },
      {
        "code": "900.80",
        "name": "Games & Play",
        "divisions": [
          {
            "code": "900.80.01",
            "name": "TTRPG rulebooks & supplements"
          },
          {
            "code": "900.80.02",
            "name": "Board & card games"
          },
          {
            "code": "900.80.03",
            "name": "Chess & abstract strategy"
          },
          {
            "code": "900.80.04",
            "name": "Video games (guides, art books & about)"
          },
          {
            "code": "900.80.05",
            "name": "Puzzles & wordplay"
          },
          {
            "code": "900.80.06",
            "name": "Sports rules, technique & coaching"
          }
        ]
      },
      {
        "code": "900.90",
        "name": "Arts Reference & Surveys",
        "divisions": [
          {
            "code": "900.90.01",
            "name": "General arts reference"
          },
          {
            "code": "900.90.02",
            "name": "Mixed-arts surveys & coffee-table compendiums"
          }
        ]
      }
    ]
  }
];
