import { Debate, PlayerRole, Suggestion, ArgumentSuggestion } from './types';
import { validateClaimWithAI, generateAIArgumentResponse, validateArgumentWithAI, generateArgumentSuggestions as generateAISuggestions } from './services/openai';

// Generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Validate a claim using AI
export const validateClaim = async (claim: string): Promise<{ valid: boolean; message: string }> => {
  try {
    const result = await validateClaimWithAI(claim);
    return {
      valid: result.valid,
      message: result.message
    };
  } catch (error) {
    console.error('Error validating claim:', error);
    
    // Fallback validation if AI fails
    if (!claim.trim()) {
      return {
        valid: false,
        message: 'The claim cannot be empty.'
      };
    }
    
    if (claim.trim().length < 10) {
      return {
        valid: false,
        message: 'The claim must be at least 10 characters long.'
      };
    }
    
    if (claim.trim().endsWith('?')) {
      return {
        valid: false,
        message: 'The claim cannot be a question. Please rephrase it as a statement.'
      };
    }
    
    // More permissive validation for commands - allow statements like "you are coming with me"
    // Only reject if it's clearly an imperative command ending with an exclamation mark
    if (claim.trim().endsWith('!') && 
        /^(please |kindly )?(do|go|come|try|make|let|give|take|put|get|run|stop|start)/i.test(claim.trim())) {
      return {
        valid: false,
        message: 'The claim appears to be a command. Please rephrase it as a debatable statement.'
      };
    }
    
    // For User vs User mode, be more permissive with validation
    // Almost any statement can be debated between two users
    return {
      valid: true,
      message: 'Valid claim.'
    };
  }
};

// Generate suggestions based on an invalid claim using AI
export const generateSuggestions = async (claim: string): Promise<Suggestion[]> => {
  try {
    const result = await validateClaimWithAI(claim);
    
    if (result.suggestions && result.suggestions.length > 0) {
      return result.suggestions.map((content, index) => ({
        id: (index + 1).toString(),
        content
      }));
    }
    
    // Fallback suggestions if AI doesn't provide any
    return getFallbackSuggestions(claim);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return getFallbackSuggestions(claim);
  }
};

// Fallback suggestions if AI fails
const getFallbackSuggestions = (claim: string): Suggestion[] => {
  // Sample suggestions based on common topics
  const suggestions: Suggestion[] = [
    { id: '1', content: 'Social media has a positive impact on society.' },
    { id: '2', content: 'Remote work is more productive than office work.' },
    { id: '3', content: 'Artificial intelligence will replace most human jobs.' },
    { id: '4', content: 'Climate change should be the top priority for governments.' },
    { id: '5', content: 'Cryptocurrency is the future of finance.' }
  ];
  
  // If the claim is not empty, try to generate more relevant suggestions
  if (claim.trim()) {
    const words = claim.toLowerCase().split(' ').filter(w => w.length > 3);
    
    if (words.includes('social') || words.includes('media')) {
      suggestions[0] = { id: '1', content: 'Social media has a positive impact on society.' };
    }
    
    if (words.includes('work') || words.includes('remote') || words.includes('office')) {
      suggestions[1] = { id: '2', content: 'Remote work is more productive than office work.' };
    }
    
    if (words.includes('ai') || words.includes('intelligence') || words.includes('artificial')) {
      suggestions[2] = { id: '3', content: 'Artificial intelligence will benefit humanity more than harm it.' };
    }
    
    if (words.includes('climate') || words.includes('environment') || words.includes('global')) {
      suggestions[3] = { id: '4', content: 'Climate change should be addressed through international cooperation.' };
    }
    
    if (words.includes('crypto') || words.includes('bitcoin') || words.includes('currency')) {
      suggestions[4] = { id: '5', content: 'Cryptocurrency will eventually replace traditional banking.' };
    }
  }
  
  return suggestions;
};

// Validate a user argument using AI
export const validateUserArgument = async (argument: string, claim: string, stance: string): Promise<any> => {
  try {
    return await validateArgumentWithAI(argument, claim, stance);
  } catch (error) {
    console.error('Error validating argument with AI:', error);
    
    // Fallback validation
    return {
      valid: true,
      message: "Valid argument.",
      suggestions: []
    };
  }
};

// Validate that an argument is relevant to the claim and has a clear stance
export const validateArgument = (argument: string, claim: string, stance: PlayerRole): boolean => {
  if (!argument.trim() || !claim.trim()) return false;
  
  // Extract key words from claim and argument
  const claimWords = claim.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const argWords = argument.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  // Check if there's some word overlap (simple relevance check)
  const hasOverlap = claimWords.some(word => argWords.includes(word));
  
  // Check for stance-specific words
  const supportWords = ['support', 'benefit', 'advantage', 'positive', 'improve', 'increase', 'better', 'good', 'superior', 'stronger'];
  const opposeWords = ['oppose', 'harm', 'disadvantage', 'negative', 'worsen', 'decrease', 'worse', 'bad', 'inferior', 'weaker'];
  
  const stanceWords = stance === 'WITH' ? supportWords : opposeWords;
  const hasStanceWords = stanceWords.some(word => argument.toLowerCase().includes(word));
  
  // For simple arguments, we'll be lenient
  if (argument.length < 30) {
    return true;
  }
  
  // For longer arguments, require some relevance or stance clarity
  return hasOverlap || hasStanceWords;
};

// Check if an argument contains multiple claims
export const containsMultipleClaims = (content: string): boolean => {
  // Simple heuristic to detect multiple claims
  const hasMultipleConjunctions = 
    (content.match(/\band\b/gi) || []).length > 0 && 
    (content.match(/,/g) || []).length > 0;
    
  const hasSemicolons = content.includes(';');
  
  const hasListStructure = 
    (content.match(/,/g) || []).length > 1 && 
    (content.match(/\b(first|second|third|finally|lastly|moreover|furthermore|additionally)\b/gi) || []).length > 0;
    
  return hasMultipleConjunctions || hasSemicolons || hasListStructure;
};

// Split a compound argument into single claims
export const splitArgument = (content: string): string => {
  // Take the first sentence or clause
  const firstSentence = content.split(/[.;]/).filter(s => s.trim().length > 0)[0];
  
  // If there are commas and conjunctions, take the first part
  if (firstSentence.includes(',') && /\band\b|\bor\b|\bbut\b/i.test(firstSentence)) {
    return firstSentence.split(/,|\band\b|\bor\b|\bbut\b/i)[0].trim();
  }
  
  return firstSentence.trim();
};

// Generate an AI argument
export const generateAIArgument = async (debate: Debate, stance: PlayerRole): Promise<string> => {
  try {
    const response = await generateAIArgumentResponse(debate, stance);
    
    // Check if the argument contains multiple claims
    if (containsMultipleClaims(response)) {
      return splitArgument(response);
    }
    
    return response;
  } catch (error) {
    console.error('Error generating AI argument:', error);
    
    // Fallback AI arguments if API fails
    const claim = debate.claims[debate.currentClaimId].content.toLowerCase();
    const claimWords = claim.split(' ').filter(w => w.length > 3);
    
    // Sample arguments for common topics with improved specificity
    const socialMediaArgs = {
      'WITH': [
        'Social media connects global communities instantly.',
        'Social platforms amplify marginalized voices effectively.',
        'Social media mobilizes important social movements quickly.',
        'These platforms democratize access to educational content.',
        'Social media helps small businesses reach targeted customers.'
      ],
      'AGAINST': [
        'Social media directly increases anxiety and depression rates.',
        'These platforms create dangerous political echo chambers.',
        'Social media companies exploit personal data for profit.',
        'The addictive design reduces meaningful face-to-face interaction.',
        'Social media enables unprecedented levels of cyberbullying.'
      ]
    };
    
    const remoteWorkArgs = {
      'WITH': [
        'Remote work eliminates stressful daily commuting time.',
        'Remote workers report significantly higher job satisfaction.',
        'Companies save substantial costs on office space.',
        'Remote work enables access to global talent pools.',
        'Productivity increases without office distractions.'
      ],
      'AGAINST': [
        'Remote work leads to professional isolation and loneliness.',
        'Creative collaboration suffers without in-person interaction.',
        'Many remote workers struggle with work-life boundaries.',
        'Company culture deteriorates in fully remote environments.',
        'Remote work creates inequalities between different types of workers.'
      ]
    };
    
    const aiArgs = {
      'WITH': [
        'AI automates dangerous tasks without human risk.',
        'AI systems work continuously without fatigue or errors.',
        'AI will create entirely new job categories.',
        'AI can solve complex problems beyond human capability.',
        'AI-driven automation increases overall economic productivity.'
      ],
      'AGAINST': [
        'AI eliminates jobs faster than creating new opportunities.',
        'AI benefits primarily flow to corporations, not workers.',
        'Most workers lack skills needed for AI-driven economy.',
        'AI systems perpetuate and amplify existing societal biases.',
        'The rapid pace of AI gives workers no time to adapt.'
      ]
    };
    
    // Military/geopolitical arguments
    const militaryArgs = {
      'WITH': [
        'Superior military technology provides decisive advantage.',
        'Greater economic resources enable sustained conflict.',
        'Advanced intelligence capabilities offer strategic edge.',
        'Better trained and equipped special forces.',
        'Control of key strategic locations and resources.'
      ],
      'AGAINST': [
        'Home territory advantage significantly impacts outcomes.',
        'Asymmetric warfare tactics neutralize technological superiority.',
        'Nuclear deterrence prevents full-scale confrontation.',
        'Public support erodes during prolonged conflicts.',
        'Historical precedents show military superiority isn\'t decisive.'
      ]
    };
    
    // USA vs Russia specific arguments
    const usaRussiaArgs = {
      'WITH': [
        'U.S. military technology is significantly more advanced.',
        'U.S. defense budget exceeds Russia\'s by over tenfold.',
        'NATO alliances provide crucial strategic advantages.',
        'U.S. has superior air and naval capabilities.',
        'U.S. cyber warfare capabilities are more sophisticated.'
      ],
      'AGAINST': [
        'Russia\'s vast geography creates defensive advantages.',
        'Russia\'s nuclear arsenal serves as a powerful deterrent.',
        'Russian military specializes in asymmetric warfare tactics.',
        'Winter conditions historically favor Russian defenders.',
        'Extended supply lines would weaken U.S. military effectiveness.'
      ]
    };
    
    // Cat-specific arguments
    const catArgs = {
      'WITH': [
        'Cats are highly intelligent and can solve complex problems.',
        'Cats have excellent memory and recognize their owners.',
        'Cats display sophisticated social intelligence with humans.',
        'Cats can learn commands and tricks through positive reinforcement.',
        'Cats show remarkable problem-solving abilities in studies.'
      ],
      'AGAINST': [
        'Cats lack the trainability of more intelligent animals.',
        'Cats cannot understand complex human commands like dogs.',
        'Cats show limited social intelligence compared to primates.',
        'Cats fail most cooperative cognitive tests in research.',
        'Cats have smaller brains relative to body size than many mammals.'
      ]
    };
    
    // Select arguments based on the claim topic
    let args;
    if (claim.includes('social media')) {
      args = socialMediaArgs;
    } else if (claim.includes('remote work') || claim.includes('work from home')) {
      args = remoteWorkArgs;
    } else if (claim.includes('ai') || claim.includes('artificial intelligence')) {
      args = aiArgs;
    } else if ((claim.includes('usa') || claim.includes('america') || claim.includes('u.s.')) && 
               (claim.includes('russia') || claim.includes('china'))) {
      args = usaRussiaArgs;
    } else if (claim.includes('war') || claim.includes('military') || claim.includes('beat') || 
               claim.includes('defeat') || claim.includes('win')) {
      args = militaryArgs;
    } else if (claim.includes('cat') || claim.includes('cats')) {
      args = catArgs;
    } else {
      // Generic arguments for any topic, but with improved specificity
      args = {
        'WITH': [
          `${claimWords[0] || 'This position'} is supported by substantial evidence.`,
          `${claimWords[0] || 'This approach'} has proven successful in similar contexts.`,
          `The benefits of ${claimWords[0] || 'this position'} outweigh potential drawbacks.`,
          `${claimWords[0] || 'This viewpoint'} aligns with widely accepted ethical principles.`,
          `Experts in ${claimWords[0] || 'this field'} overwhelmingly support this position.`
        ],
        'AGAINST': [
          `${claimWords[0] || 'This position'} overlooks critical implementation factors.`,
          `Evidence supporting ${claimWords[0] || 'this approach'} is methodologically flawed.`,
          `${claimWords[0] || 'This approach'} has consistently negative outcomes.`,
          `${claimWords[0] || 'This position'} raises serious ethical concerns.`,
          `${claimWords[0] || 'This approach'} fails to account for diverse community needs.`
        ]
      };
    }
    
    // Check for existing arguments to avoid duplicates
    const currentClaim = debate.claims[debate.currentClaimId];
    const existingArgs = currentClaim.arguments
      .filter(arg => arg.stance === stance)
      .map(arg => arg.content.toLowerCase());
    
    // Filter out arguments that have already been used
    const availableArgs = args[stance].filter(arg => 
      !existingArgs.some(existing => existing.includes(arg.toLowerCase()))
    );
    
    // If all arguments have been used, modify one slightly
    if (availableArgs.length === 0) {
      const randomIndex = Math.floor(Math.random() * args[stance].length);
      const baseArg = args[stance][randomIndex];
      
      // Add specificity
      const specificAdditions = [
        ` This directly impacts ${claimWords[0] || 'the core issue'}.`,
        ` The evidence specifically shows this for ${claimWords[0] || 'this topic'}.`,
        ` This is particularly relevant to ${claimWords[0] || 'the current debate'}.`,
        ` Research confirms this specific effect on ${claimWords[0] || 'the matter'}.`,
        ` This point directly addresses ${claimWords[0] || 'the claim'}.`
      ];
      const randomAddition = specificAdditions[Math.floor(Math.random() * specificAdditions.length)];
      return baseArg + randomAddition;
    }
    
    // Select a random argument from the available ones
    const randomIndex = Math.floor(Math.random() * availableArgs.length);
    return availableArgs[randomIndex];
  }
};

// Generate argument suggestions based on difficulty
export const generateArgumentSuggestions = async (
  claim: string,
  stance: PlayerRole,
  difficulty: string
): Promise<ArgumentSuggestion[]> => {
  try {
    // Generate suggestions using AI
    const suggestions = await generateAISuggestions(
      claim,
      stance,
      difficulty
    );
    
    // Convert to ArgumentSuggestion format
    return suggestions.map(suggestion => ({
      id: generateId(),
      content: suggestion.content,
      stance
    }));
  } catch (error) {
    console.error('Error generating argument suggestions:', error);
    
    // Fallback suggestions
    const claimWords = claim.toLowerCase().split(' ').filter(w => w.length > 3);
    const mainWord = claimWords[0] || 'this topic';
    
    // Adjust suggestion detail based on difficulty
    const getDetailLevel = (baseArg: string) => {
      switch(difficulty) {
        case 'Easy':
          return baseArg;
        case 'Medium':
          return baseArg.split(' ').slice(0, Math.ceil(baseArg.split(' ').length / 2)).join(' ') + '...';
        case 'Hard':
          return `Consider ${baseArg.split(' ').slice(0, 3).join(' ')}...`;
        default:
          return baseArg;
      }
    };
    
    // Sample arguments for common topics
    const socialMediaArgs = {
      'WITH': [
        'Social media connects people across vast distances, fostering global communities.',
        'Social platforms give voice to marginalized groups that traditional media ignores.',
        'These platforms provide free access to educational content for disadvantaged communities.'
      ],
      'AGAINST': [
        'Social media contributes to increased anxiety and depression, especially among youth.',
        'These platforms create echo chambers that polarize society and spread misinformation.',
        'The addictive design of social media reduces meaningful face-to-face interaction.'
      ]
    };
    
    const remoteWorkArgs = {
      'WITH': [
        'Remote work eliminates stressful commuting time, improving work-life balance.',
        'Companies save significant costs on office space while maintaining productivity.',
        'Remote work allows access to global talent pools without geographic limitations.'
      ],
      'AGAINST': [
        'Remote work leads to professional isolation and decreased collaboration.',
        'Many workers struggle with work-life boundaries when working from home.',
        'Company culture is harder to build and maintain in fully remote environments.'
      ]
    };
    
    const aiArgs = {
      'WITH': [
        'AI can automate dangerous tasks without putting humans at risk.',
        'AI systems work continuously without fatigue, increasing overall productivity.',
        'Historical technological revolutions have always created more jobs than they eliminated.'
      ],
      'AGAINST': [
        'AI will eliminate jobs faster than new opportunities can be created.',
        'The benefits of AI primarily go to corporations, not to displaced workers.',
        'AI systems perpetuate and amplify existing societal biases in their algorithms.'
      ]
    };
    
    // Cat-specific arguments
    const catArgs = {
      'WITH': [
        'Cats display remarkable problem-solving abilities in controlled studies.',
        'Cats can learn and remember solutions to complex puzzles for years.',
        'Cats show sophisticated social intelligence in their interactions with humans.'
      ],
      'AGAINST': [
        'Cats consistently score lower than dogs on trainability and obedience tests.',
        'Cats fail most cooperative cognitive tasks in comparative animal studies.',
        'Cats lack the neural density in key brain regions associated with complex reasoning.'
      ]
    };
    
    // Select arguments based on the claim topic
    let args;
    if (claim.toLowerCase().includes('social media')) {
      args = socialMediaArgs;
    } else if (claim.toLowerCase().includes('remote work') || claim.toLowerCase().includes('work from home')) {
      args = remoteWorkArgs;
    } else if (claim.toLowerCase().includes('ai') || claim.toLowerCase().includes('artificial intelligence')) {
      args = aiArgs;
    } else if (claim.toLowerCase().includes('cat') || claim.toLowerCase().includes('cats')) {
      args = catArgs;
    } else {
      // Generic arguments for any topic
      args = {
        'WITH': [
          `${mainWord} is supported by substantial evidence from multiple peer-reviewed studies.`,
          `The economic benefits of ${mainWord} significantly outweigh potential drawbacks.`,
          `Historical precedents clearly demonstrate the effectiveness of ${mainWord}.`
        ],
        'AGAINST': [
          `${mainWord} overlooks critical implementation factors that make it impractical.`,
          `The supporting evidence for ${mainWord} contains serious methodological flaws.`,
          `${mainWord} raises serious ethical concerns that cannot be easily dismissed.`
        ]
      };
    }
    
    // Number of suggestions based on difficulty
    const suggestionCount = {
      'Easy': 3,
      'Medium': 2,
      'Hard': 1
    }[difficulty] || 2;
    
    // Select and format arguments based on difficulty
    const selectedArgs = args[stance].slice(0, suggestionCount).map((arg, index) => ({
      id: generateId(),
      content: getDetailLevel(arg),
      stance: stance
    }));
    
    return selectedArgs;
  }
};

// Format time (seconds) to MM:SS
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Sound effects
export const SOUNDS = {
  BUZZER: '/sounds/buzzer.mp3',
  APPLAUSE: '/sounds/applause.mp3',
  CLICK: '/sounds/click.mp3'
};