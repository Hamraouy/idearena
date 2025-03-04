import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Check if API key is missing or using the placeholder value
const isValidApiKey = apiKey && apiKey !== 'your_openai_api_key_here';

if (!isValidApiKey) {
  console.error('OpenAI API key is missing or invalid. Please add a valid key to your .env file.');
}

// Create OpenAI client only if we have a valid API key
const openai = isValidApiKey ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true // Note: In production, you should use a backend service
}) : null;

export interface ValidationResult {
  valid: boolean;
  message: string;
  suggestions?: string[];
}

// Retry function with exponential backoff
const retryWithBackoff = async (fn: Function, maxRetries = 3) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export async function validateClaimWithAI(claim: string): Promise<ValidationResult> {
  if (!claim.trim()) {
    return {
      valid: false,
      message: 'The claim cannot be empty.'
    };
  }

  // If no valid API key, use fallback validation
  if (!isValidApiKey) {
    console.warn('Using fallback validation due to missing API key');
    return fallbackValidation(claim);
  }

  try {
    const response = await retryWithBackoff(() => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert debate moderator. Your task is to validate if a given statement is a proper debatable claim.
            
            A good debatable claim:
            1. Is a clear, single opinion (not multiple claims)
            2. Naturally accepts opposition (someone could reasonably argue for or against it)
            3. Is not a question or command
            4. Is specific enough to debate meaningfully
            5. Is not purely factual (should involve opinion, values, or predictions)
            
            IMPORTANT: Be very permissive with statements that could be debated in a User vs User context.
            For example, "You are coming with me" can be debated (one could argue for or against going).
            
            Respond with a JSON object containing:
            - valid: boolean (true if it's a good debatable claim, false otherwise)
            - message: string (explanation of why it's valid or invalid)
            - suggestions: array of strings (5 improved versions if invalid, empty if valid)
            
            Make all suggestions extremely concise but clear.`
          },
          {
            role: "user",
            content: claim
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      valid: result.valid,
      message: result.message,
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error('Error validating claim with AI:', error);
    return fallbackValidation(claim);
  }
}

function fallbackValidation(claim: string): ValidationResult {
  // Basic validation rules
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
  if (claim.trim().length >= 10) {
    return {
      valid: true,
      message: 'Valid claim.'
    };
  }
  
  const debatableWords = ['should', 'could', 'would', 'is', 'are', 'will', 'can'];
  const hasDebatableWord = debatableWords.some(word => 
    claim.toLowerCase().includes(` ${word} `) || 
    claim.toLowerCase().startsWith(`${word} `)
  );
  
  if (!hasDebatableWord) {
    return {
      valid: false,
      message: 'The claim should be debatable. Try including words like "should", "is", "will", etc.'
    };
  }
  
  return {
    valid: true,
    message: 'Valid claim.'
  };
}

export async function validateArgumentWithAI(argument: string, claim: string, stance: string): Promise<ValidationResult> {
  if (!argument.trim()) {
    return {
      valid: false,
      message: "Your argument cannot be empty.",
      suggestions: []
    };
  }

  // If no valid API key, use fallback validation
  if (!isValidApiKey) {
    console.warn('Using fallback validation due to missing API key');
    return fallbackArgumentValidation(argument, claim, stance);
  }

  try {
    const response = await retryWithBackoff(() => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert debate coach. Your task is to validate if an argument is valid and relevant to a claim.
            
            A good argument:
            1. Is clearly relevant to the claim being debated
            2. Takes a clear stance (either supporting or opposing)
            3. Contains a single, focused point (not multiple arguments)
            4. Is specific and not overly general
            5. Is a statement, not a question
            
            You are validating an argument that is meant to be ${stance === 'WITH' ? 'SUPPORTING' : 'OPPOSING'} the claim.
            
            Respond with a JSON object containing:
            - valid: boolean (true if it's a good argument, false if it has serious issues)
            - message: string (explanation of why it's valid or invalid, or suggestions for improvement)
            - suggestions: array of strings (3 improved versions of the argument that maintain the original intent but fix any issues)
            
            Make all suggestions concise, clear, and maintain the same ${stance === 'WITH' ? 'supporting' : 'opposing'} stance.`
          },
          {
            role: "user",
            content: `Claim: "${claim}"
            
            ${stance === 'WITH' ? 'Supporting' : 'Opposing'} Argument: "${argument}"`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      valid: result.valid,
      message: result.message,
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error('Error validating argument with AI:', error);
    return fallbackArgumentValidation(argument, claim, stance);
  }
}

function fallbackArgumentValidation(argument: string, claim: string, stance: string): ValidationResult {
  // Basic validation rules
  if (argument.trim().length < 5) {
    return {
      valid: false,
      message: "Your argument is too short. Please provide a more detailed argument.",
      suggestions: [
        "Consider expanding on your point with specific details.",
        "Add evidence or reasoning to support your position.",
        "Explain why your argument is relevant to the claim."
      ]
    };
  }
  
  // Check if argument is a question
  if (argument.trim().endsWith('?')) {
    return {
      valid: false,
      message: "Your argument should be a statement, not a question.",
      suggestions: [
        argument.trim().replace(/\?$/, '.'),
        `${argument.trim().replace(/\?$/, '')} is a valid point.`,
        `It's clear that ${argument.trim().replace(/\?$/, '.')}`
      ]
    };
  }
  
  // Check for relevance to the claim
  const claimWords = claim.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const argumentWords = argument.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  // Check for word overlap
  const hasOverlap = claimWords.some(word => argumentWords.includes(word));
  
  if (!hasOverlap) {
    // Generate suggestions based on the claim
    const stanceText = stance === 'WITH' ? 'supporting' : 'opposing';
    const suggestions = [
      `${argument.trim()} This directly relates to ${claimWords[0] || 'the claim'}.`,
      `${claimWords[0] || 'The claim'} is ${stanceText === 'supporting' ? 'valid because' : 'invalid because'} ${argument.trim().toLowerCase()}.`,
      `This argument shows why ${claimWords[0] || 'the claim'} is ${stanceText === 'supporting' ? 'correct' : 'incorrect'}.`
    ];
    
    return {
      valid: false,
      message: `Your argument doesn't seem directly related to the claim "${claim}". Please make sure your argument clearly addresses the claim.`,
      suggestions
    };
  }
  
  // Check for stance clarity
  const supportingWords = ['support', 'agree', 'correct', 'right', 'valid', 'true', 'benefit', 'advantage', 'positive', 'good'];
  const opposingWords = ['oppose', 'disagree', 'incorrect', 'wrong', 'invalid', 'false', 'harm', 'disadvantage', 'negative', 'bad'];
  
  const stanceWords = stance === 'WITH' ? supportingWords : opposingWords;
  const hasStanceClarity = stanceWords.some(word => argument.toLowerCase().includes(word));
  
  if (!hasStanceClarity) {
    // The argument might still be valid, but we'll suggest improvements
    const stanceText = stance === 'WITH' ? 'supporting' : 'opposing';
    const suggestions = [
      `${argument.trim()} This clearly ${stanceText === 'supporting' ? 'supports' : 'opposes'} the claim.`,
      `This ${stanceText} argument demonstrates why ${claimWords[0] || 'the claim'} is ${stanceText === 'supporting' ? 'valid' : 'invalid'}.`,
      `${argument.trim()}, which is why the claim is ${stanceText === 'supporting' ? 'correct' : 'incorrect'}.`
    ];
    
    return {
      valid: true, // Still valid, but could be improved
      message: `Your argument could be clearer about ${stanceText} the claim. Consider revising to make your stance more explicit.`,
      suggestions
    };
  }
  
  // If we get here, the argument is valid
  return {
    valid: true,
    message: "Valid argument.",
    suggestions: []
  };
}

export async function generateAIArgumentResponse(
  debate: any,
  stance: 'WITH' | 'AGAINST'
): Promise<string> {
  // If no valid API key, use fallback arguments
  if (!isValidApiKey) {
    console.warn('Using fallback arguments due to missing API key');
    return getFallbackArgument(debate, stance);
  }

  const currentClaim = debate.claims[debate.currentClaimId];
  const previousArguments = currentClaim.arguments.map((arg: any) => ({
    content: arg.content,
    stance: arg.stance
  }));

  try {
    const response = await retryWithBackoff(() => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert debater. Generate a concise, powerful argument ${stance === 'WITH' ? 'supporting' : 'opposing'} the claim.
            
            CRITICAL REQUIREMENTS:
            1. EXTREMELY CONCISE - maximum 15 words
            2. ONE claim per argument only
            3. No unnecessary words
            4. Different from previous arguments
            5. Clear and impactful
            6. MUST be DIRECTLY related to the main claim
            7. MUST have a clear ${stance === 'WITH' ? 'supporting' : 'opposing'} stance
            8. MUST be specific, not general or vague
            9. Use specific terms from the claim when possible
            
            Respond with ONLY the argument text, no additional commentary.`
          },
          {
            role: "user",
            content: `Claim: "${currentClaim.content}"
            
            Previous arguments:
            ${previousArguments.map((arg: any) => `- ${arg.stance}: ${arg.content}`).join('\n')}
            
            Generate a ${stance === 'WITH' ? 'supporting' : 'opposing'} argument:`
          }
        ],
        temperature: 0.8,
        max_tokens: 50
      })
    );

    return response.choices[0].message.content?.trim() || 
      "I couldn't generate a valid argument at this time.";
  } catch (error) {
    console.error('Error generating AI argument:', error);
    return getFallbackArgument(debate, stance);
  }
}

function getFallbackArgument(debate: any, stance: 'WITH' | 'AGAINST'): string {
  const claim = debate.claims[debate.currentClaimId].content.toLowerCase();
  const claimWords = claim.split(' ').filter((w: string) => w.length > 3);
  
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
  
  // Additional topic-specific arguments
  const politicsArgs = {
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

  // Military conflict specific arguments
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
    args = politicsArgs;
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
    .filter((arg: any) => arg.stance === stance)
    .map((arg: any) => arg.content.toLowerCase());
  
  // Filter out arguments that have already been used
  const availableArgs = args[stance].filter((arg: string) => 
    !existingArgs.some((existing: string) => existing.includes(arg.toLowerCase()))
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

export async function generateTopicSuggestions(): Promise<any[]> {
  // If no valid API key, return fallback topics
  if (!isValidApiKey) {
    console.warn('Using fallback topics due to missing API key');
    return getFallbackTopics();
  }

  try {
    const response = await retryWithBackoff(() => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Generate 6 trending, engaging debate topics that would be interesting to discuss.
            
            Each topic should:
            1. Be a clear, debatable claim (not a question)
            2. Be controversial enough that people could reasonably argue both sides
            3. Be relevant to current events or timeless issues
            4. Be extremely concise (5-8 words maximum)
            
            Respond with a JSON array of objects, each with:
            - id: string (unique identifier)
            - title: string (the debate claim)
            - description: string (brief explanation of the topic)`
          }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      })
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.topics || getFallbackTopics();
  } catch (error) {
    console.error('Error generating topic suggestions:', error);
    return getFallbackTopics();
  }
}

function getFallbackTopics() {
  return [
    {
      id: '1',
      title: 'Social media benefits society',
      description: 'Debate whether social media platforms have a net positive impact on society.'
    },
    {
      id: '2',
      title: 'Remote work is better',
      description: 'Discuss if remote work is superior to traditional office environments.'
    },
    {
      id: '3',
      title: 'AI will replace human jobs',
      description: 'Debate if artificial intelligence will ultimately replace most human jobs.'
    },
    {
      id: '4',
      title: 'Space exploration is worth it',
      description: 'Discuss if the benefits of space exploration justify its enormous costs.'
    },
    {
      id: '5',
      title: 'Cryptocurrency is the future',
      description: 'Debate whether cryptocurrency will become the dominant form of currency.'
    },
    {
      id: '6',
      title: 'UBI should be implemented',
      description: 'Discuss if governments should provide a universal basic income to all citizens.'
    }
  ];
}

export async function generateArgumentSuggestions(
  claim: string,
  stance: 'WITH' | 'AGAINST',
  difficulty: string
): Promise<any[]> {
  // If no valid API key, use fallback suggestions
  if (!isValidApiKey) {
    console.warn('Using fallback argument suggestions due to missing API key');
    return getFallbackArgumentSuggestions(claim, stance, difficulty);
  }

  // Number of suggestions based on difficulty
  const suggestionCount = {
    'Easy': 3,
    'Medium': 2,
    'Hard': 1
  }[difficulty] || 2;

  try {
    const response = await retryWithBackoff(() => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert debate coach. Generate ${suggestionCount} high-quality argument suggestions that are ${stance === 'WITH' ? 'supporting' : 'opposing'} the given claim.
            
            The difficulty level is set to ${difficulty}:
            - Easy: Provide complete, ready-to-use arguments
            - Medium: Provide partial argument frameworks that need expansion
            - Hard: Provide minimal hints that point in the right direction
            
            Each suggestion should:
            1. Be directly relevant to the claim
            2. Have a clear ${stance === 'WITH' ? 'supporting' : 'opposing'} stance
            3. Be concise but substantive
            4. Be unique from other suggestions
            5. Match the appropriate difficulty level
            
            Respond with a JSON array of objects, each with:
            - id: string (unique identifier)
            - content: string (the argument suggestion)
            - stance: string (either "WITH" or "AGAINST")`
          },
          {
            role: "user",
            content: `Claim: "${claim}"
            
            Generate ${suggestionCount} ${stance === 'WITH' ? 'supporting' : 'opposing'} argument suggestions at ${difficulty} difficulty.`
          }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      })
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.suggestions || getFallbackArgumentSuggestions(claim, stance, difficulty);
  } catch (error) {
    console.error('Error generating argument suggestions:', error);
    return getFallbackArgumentSuggestions(claim, stance, difficulty);
  }
}

function getFallbackArgumentSuggestions(claim: string, stance: 'WITH' | 'AGAINST', difficulty: string): any[] {
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
    id: (index + 1).toString(),
    content: getDetailLevel(arg),
    stance: stance
  }));
  
  return selectedArgs;
}