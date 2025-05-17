// src/utils/PrereleaseCardFilter.js

import TemporalForces from '../data/pre-release-sets/TemporalForces.json';
import TwilightMasquerade from '../data/pre-release-sets/TwilightMasquerade.json';
import ShroudedFable from '../data/pre-release-sets/ShroudedFable.json';
import StellarCrown from '../data/pre-release-sets/StellarCrown.json';

// Combine all prerelease sets
const allSets = [...TwilightMasquerade, ...ShroudedFable, ...StellarCrown, ...TemporalForces];

class PrereleaseCardFilter {
  static filter(filterParams) {
    // Start with full set of cards
    let results = [...allSets];
    
    // Filter by name if provided
    if (filterParams.name) {
      const searchTerm = filterParams.name.toLowerCase();
      results = results.filter(card => 
        card.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by supertype (Pokémon, Trainer, Energy)
    if (filterParams.supertypes && filterParams.supertypes.length > 0) {
      results = results.filter(card => {
        // Handle both 'Pokémon' and 'Pokemon' spelling variations
        if (filterParams.supertypes.includes('Pokémon') && card.supertype === 'Pokemon') {
          return true;
        }
        if (filterParams.supertypes.includes('Pokemon') && card.supertype === 'Pokémon') {
          return true;
        }
        return filterParams.supertypes.includes(card.supertype);
      });
    }
    
    // Filter by type
    if (filterParams.types && filterParams.types.length > 0) {
      results = results.filter(card => {
        // Match card against energy types
        // For prerelease cards, sometimes the types info is inferred from the card name
        // or we might not have explicit types listed
        if (!card.types) {
          // Fallback to checking the name for type references
          return filterParams.types.some(type => 
            card.name.toLowerCase().includes(type.toLowerCase())
          );
        }
        
        // If we have types listed, check those
        return filterParams.types.some(type => 
          card.types.includes(type)
        );
      });
    }
    
    // Filter by subtypes
    if (filterParams.subtypes && filterParams.subtypes.length > 0) {
      results = results.filter(card => {
        if (!card.subtypes) return false;
        
        return filterParams.subtypes.some(subtype => 
          card.subtypes.includes(subtype)
        );
      });
    }
    
    // We can't really filter by rarity for prerelease cards as they don't have this property
    // We could add a placeholder rarity field to the prerelease cards if needed
    
    return results;
  }
}

export default PrereleaseCardFilter;