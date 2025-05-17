import TemporalForces from '../data/pre-release-sets/TemporalForces.json'
import TwilightMasquerade from '../data/pre-release-sets/TwilightMasquerade.json';
import ShroudedFable from '../data/pre-release-sets/ShroudedFable.json';
import StellarCrown from '../data/pre-release-sets/StellarCrown.json';

const validFilters = ['name'];
const allSets = [TwilightMasquerade, ShroudedFable, StellarCrown];

class PrereleaseCardFilter {
    // Modify utils/PrereleaseCardFilter.js

// In PrereleaseCardFilter.js - Update the filter method

static filter(filterParams) {
    // External card set in assets
    let fullSet = [].concat(...allSets);
    
    // Copy the array to avoid modifying the original
    let results = [...fullSet];
    
    // Filter by name if provided
    if (filterParams.name) {
      const searchTerm = filterParams.name.toLowerCase();
      results = results.filter(card => 
        card.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by type
    if (filterParams.types && filterParams.types.length > 0) {
      results = results.filter(card => {
        if (!card.types) return false;
        return filterParams.types.some(type => 
          card.types.includes(type) || 
          card.name.toLowerCase().includes(type.toLowerCase())
        );
      });
    }
    
    // Filter by supertype
    if (filterParams.supertypes && filterParams.supertypes.length > 0) {
      results = results.filter(card => 
        filterParams.supertypes.includes(card.supertype)
      );
    }
    
    // Filter by set
    if (filterParams.sets && filterParams.sets.length > 0) {
      results = results.filter(card => {
        if (!card.set) return false;
        return filterParams.sets.includes(card.set.id);
      });
    }
    
    // Filter by rarity
    if (filterParams.rarities && filterParams.rarities.length > 0) {
      results = results.filter(card => {
        if (!card.rarity) return false;
        return filterParams.rarities.includes(card.rarity);
      });
    }
    
    return results;
  }
}

export default PrereleaseCardFilter;