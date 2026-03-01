
export enum UserRole {
  CLIENT = 'CLIENT',
  THERAPIST = 'THERAPIST',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export type SubscriptionPlan = 'Basic' | 'Professional' | 'Enterprise';

export type SchedulePreference = 'MonThu' | 'TueFri' | 'WedSat';

export interface SessionData {
  sessionNumber: number;
  stepId: string;
  stepTitle?: string;
  inputValue: any;
  timestamp: string;
}

export interface SessionResult {
  sessionNumber: number;
  timestamp: string;
  moodBefore: number;
  moodAfter?: number;
  reflections: Record<string, any>;
  completed: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  clinicId?: string;
  currentSession?: number; // 1-12
  assignedTherapistId?: string;
  prescribedSessions?: number[]; // indices of sessions (0-11)
  profileImage?: string; // base64 or URL
  phoneNumber?: string;
  hasConsented?: boolean;
  consentTimestamp?: string; // ISO format
  schedulePreference?: SchedulePreference;
  assessmentScores?: {
    mood: number;
    pcl5: number;
    emotionalDysregulation: number;
    aaq: number;
    timestamp: string;
  };
  sessionHistory?: SessionResult[];
  sessionData?: SessionData[];
}

export interface SessionStepDefinition {
  id: string;
  title: string;
  type: 'intro' | 'reflection' | 'exercise' | 'questionnaire' | 'meditation' | 'closing';
  content?: string;
  questions?: {
    id: string;
    text: string;
    type: 'text' | 'likert' | 'choice';
    options?: string[];
  }[];
  exerciseData?: any;
}

export interface TherapySession {
  number: number;
  title: string;
  description: string;
  objective: string;
  moduleKey: string;
  steps: SessionStepDefinition[];
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  contactEmail: string;
  plan: SubscriptionPlan;
  status: 'Live' | 'Setup' | 'Review';
  usersCount: number;
  revenue?: number;
  retentionRate?: number;
}

export interface LifeDomain {
  id: string;
  name: string;
  icon: string;
  value: string;
  action: string;
}

export interface DefusionTechnique {
  name: string;
  description: string;
  exercise: string;
}

export type ImageSize = '1K' | '2K' | '4K';

export const PTSD_TRIGGERS_LIST = [
  "Crowded spaces", "Loud noises", "Conflict with family", "Work stress", "Anniversaries", "Specific smells/places", "Feelings of failure", "Nightmares"
];

export const WARNING_SIGNS_LIST = [
  { id: 'w1', text: "Repeated unwanted memories or nightmares" },
  { id: 'w2', text: "Flashbacks or strong reactions to reminders" },
  { id: 'w3', text: "Avoiding places, people, or thoughts" },
  { id: 'w4', text: "Feeling numb, detached, guilty, or ashamed" },
  { id: 'w5', text: "Irritability, anger, or being easily startled" },
  { id: 'w6', text: "Trouble sleeping or concentrating" },
  { id: 'w7', text: "Feeling constantly on guard or unsafe" }
];

export const ACT_SKILLS_LIST = [
  { id: 'grounding', name: 'Grounding', icon: 'fa-anchor' },
  { id: 'defusion', name: 'Defusion', icon: 'fa-scissors' },
  { id: 'acceptance', name: 'Acceptance', icon: 'fa-heart' },
  { id: 'action', name: 'Committed Action', icon: 'fa-play' },
  { id: 'crisis', name: 'Crisis Button', icon: 'fa-bolt-lightning' }
];

export const THERAPY_SESSIONS: TherapySession[] = [
  { 
    number: 1, 
    title: 'Creative Hopelessness', 
    description: 'Examining the agenda of control and identifying what is truly workable in your recovery journey.', 
    objective: 'Identify the "workability" of current coping strategies and the cost of the struggle.', 
    moduleKey: 'ch',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Welcome to your first session. Thank you for taking part. This session is designed to support your well-being. Find a position that feels comfortable for your body. Choose a place where you feel safe and have as few distractions as possible. If at any point you feel uncomfortable, you can adjust your position or pause." 
      },
      { 
        id: 'instructions', 
        title: 'Instructions', 
        type: 'reflection', 
        content: "Before we begin, please remember:\n• There are no right or wrong answers.\n• Take your time, go at your own pace.\n• Your responses help us understand you better." 
      },
      { 
        id: 'questions-1', 
        title: 'Workability Check', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'q1', 
            text: "What do you do when pain shows up?", 
            type: 'choice', 
            options: ['Avoid people', 'Sleep too much', 'Overthink', 'Distract', 'Substance use', 'Suppress feelings', 'Others'] 
          },
          { 
            id: 'q1_other', 
            text: "If you chose 'Others', please specify:", 
            type: 'text' 
          },
          { 
            id: 'q2', 
            text: "Did this help long-term?", 
            type: 'choice', 
            options: ['Yes', 'No'] 
          },
          { 
            id: 'q3', 
            text: "Have these habits helped in the moment but caused stress later?", 
            type: 'choice', 
            options: ['Yes', 'No'] 
          },
          { 
            id: 'q4', 
            text: "What did it cost you? / What did you lose in the process? (e.g., distancing relationships, delaying important tasks, missing responsibilities)", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'grounding-prep', 
        title: 'Body Awareness', 
        type: 'reflection', 
        content: "• Right now, where are you sitting or standing? Can you feel your feet on the floor?\n• Notice your body. Are there areas of tension or heaviness?\n• What can you see, hear, or feel around you at this moment?" 
      },
      { 
        id: 'exercise-1', 
        title: 'Dropping the Anchor', 
        type: 'exercise', 
        content: "Sit or lie down in a position that feels safe and relaxed. Let your hands rest comfortably, and notice the support under your body. Bring attention to your feet touching the floor. Feel the weight of your body on the chair or floor. Notice how your body feels right now — areas of tension, heaviness, or ease. Gently look around and notice three things you can see. Listen carefully for two things you can hear. Notice one thing you can touch or feel with your hands. Take slow, gentle breaths. Notice the air entering and leaving your lungs. With each breath, feel yourself becoming more steady and calm. Silently say to yourself: ‘I am here. I am safe. I am in the present.’ ‘I am here. I am safe. I am in the present’. Repeat this a few times, noticing how it feels in your body. With each breath, feel yourself becoming more steady and calm. When you are ready, slowly open your eyes (if they were closed) and bring your attention back to your surroundings. Notice any small changes in your body, mind, or mood. Note: you can return to this exercise anytime you feel overwhelmed or distracted." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "Home Work: Dropping the Anchor" 
      }
    ]
  },
  { 
    number: 2, 
    title: 'Acceptance & Defusion', 
    description: 'Learning to drop the struggle with difficult emotions and sensations through visualization.', 
    objective: 'Practice the "Leaves on a Stream" exercise for cognitive defusion.', 
    moduleKey: 'acc',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome Back', 
        type: 'intro', 
        content: "Welcome back! I hope you’ve had a good week. Find a position that feels comfortable for your body. Choose a place where you feel safe and have as few distractions as possible. If at any point you feel uncomfortable, you can adjust your position or pause." 
      },
      { 
        id: 'check-in', 
        title: 'Check-in on Practice', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'practice_review', 
            text: "Last week, we practiced the ‘Dropping the Anchor’ exercise. Can you tell me when and where you did it? Did you notice any changes in your body, mind, or emotions while doing it?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'inner-world', 
        title: 'Acknowledge your Inner World', 
        type: 'questionnaire',
        questions: [
          { id: 'thoughts_now', text: "What thoughts are in my mind right now?", type: 'text' },
          { id: 'feelings_now', text: "What feelings am I noticing in my body?", type: 'text' },
          { id: 'sensations_now', text: "What physical sensations am I aware of?", type: 'text' }
        ]
      },
      {
        id: 'defusion-practice',
        title: 'Defusion Practice',
        type: 'reflection',
        content: "Now, take what you just wrote and convert it into 'I am having...' or 'I am noticing...' statements.\n\nREAD ALOUD:\n• 'I am having the thought that...' (e.g., I am noticing scary thoughts)\n• 'I am noticing...' (e.g., I am noticing sadness)\n• 'I am having...' (e.g., I am having anxiety)"
      },
      { 
        id: 'exercise-2', 
        title: 'Leaves on a Stream', 
        type: 'exercise', 
        content: "(1) Sit in a comfortable position and either close your eyes or rest them gently on a fixed spot in the room.\n\n(2) Visualize yourself sitting beside a gently flowing stream with leaves floating along the surface of the water. (Pause 10 seconds)\n\n(3) For the next few minutes, take each thought that enters your mind and place it on a leaf… let it float by. Do this with each thought – pleasurable, painful, or neutral. Even if you have joyous or enthusiastic thoughts, place them on a leaf and let them float by.\n\n(4) If your thoughts momentarily stop, continue to watch the stream. Sooner or later, your thoughts will start up again. (Pause 20 seconds)\n\n(5) Allow the stream to flow at its own pace. Don’t try to speed it up and rush your thoughts along. You’re not trying to rush the leaves along or “get rid” of your thoughts. You are allowing them to come and go at their own pace.\n\n(6) If your mind says “This is dumb,” “I’m bored,” or “I’m not doing this right” place those thoughts on leaves, too, and let them pass. (Pause 20 seconds)\n\n(7) If a leaf gets stuck, allow it to hang around until it’s ready to float by. If the thought comes up again, watch it float by another time. (Pause 20 seconds)\n\n(8) If a difficult or painful feeling arises, simply acknowledge it. Say to yourself, “I notice myself having a feeling of boredom/impatience/frustration.” Place those thoughts on leaves and allow them float along.\n\n(9) From time to time, your thoughts may hook you and distract you from being fully present in this exercise. This is normal. As soon as you realize that you have become sidetracked, gently bring your attention back to the visualization exercise." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "Homework: Practice the ‘Leaves on the Stream’ exercise daily. Spend 5 minutes noticing your thoughts and imagining placing each thought on a leaf, letting it gently float away." 
      }
    ]
  },
  { 
    number: 3, 
    title: 'Diffusion 1', 
    description: 'Starting to see thoughts as just thoughts, rather than objective truths or commands.', 
    objective: 'Learn basic cognitive defusion techniques to "unhook" from the mind.', 
    moduleKey: 'def1',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Find a position that feels comfortable for your body. Choose a place where you feel safe and have as few distractions as possible. If at any point you feel uncomfortable, you can adjust your position or pause." 
      },
      { 
        id: 'check-in', 
        title: 'Check-in on Practice', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'practice_review_s3', 
            text: "Last week, we practiced the discussed Acknowledging inner world exercise. What thoughts or feelings did you notice last week? Did noticing them change how you felt or reacted in any way?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'thought-id', 
        title: 'Thought Identification', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'bothering_thought', 
            text: "What thought is bothering you? (e.g., I’m not safe, It was my fault, I’m broken)", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'visual-defusion', 
        title: 'Visual Techniques', 
        type: 'exercise', 
        content: "Now, visualize that thought in these different ways:\n\n• In playful colorful letters on the cover of a children's book\n• As stylish graphics on a restaurant menu\n• As floating clouds in the sky\n• On leaves carrying the text down a stream\n• As weather animations on a screen\n• As icing on top of a birthday cake\n• In chalk on a blackboard\n• As a slogan on a T-shirt\n• On a computer screen: Running words down the screen, joining all words then moving." 
      },
      { 
        id: 'thought-relation', 
        title: 'Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'relate_to_thoughts', 
            text: "How do you relate to your thoughts now?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'struggle-switch', 
        title: 'The Struggle Switch', 
        type: 'exercise', 
        content: "That means noticing whatever you’re feeling right now, without trying to change it, and just letting it be for a moment. Imagine that at the back of our mind is a switch – we’ll call it the ‘struggle switch.’\n\nWhen it’s switched on, it means we’re going to struggle against any physical or emotional pain that comes our way; whatever discomfort we experience, we’ll see it as a problem and try hard to get rid of it or avoid it.\n\nSuppose the emotion that shows up is anxiety. If our struggle switch is ON, then that feeling is completely unacceptable. So we could end up with anger about our anxiety…or anxiety about our anxiety…or guilt about our anxiety…or maybe even a mixture of all these feelings at once. What all these secondary emotions have in common is that they are unpleasant, unhelpful, and a drain on our energy and vitality.\n\nNow imagine what happens if our struggle switch is OFF. In this case, whatever emotion shows up, no matter how unpleasant, we do not struggle with it. Thus, when anxiety shows up, it’s not a problem. Sure, it’s unpleasant and we don’t like it, but it’s nothing terrible. With the struggle switch OFF, our anxiety levels are free to rise and fall as the situation dictates. Sometimes they’ll be high, sometimes low, and sometimes there will be no anxiety at all. But more importantly, we’re not wasting our time and energy struggling with it." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "This week, practice noticing your 'Struggle Switch'. See if you can gently flip it to OFF when discomfort arises." 
      }
    ]
  },
  { 
    number: 4, 
    title: 'Observe Your Thoughts', 
    description: 'Developing the ability to step back and observe thoughts using auditory defusion and metaphors.', 
    objective: 'Practice auditory defusion and the chessboard metaphor.', 
    moduleKey: 'obs',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Hello! I’m glad you are here today. I appreciate the effort you are making in practicing the exercises. Even small steps are important progress. Today, we will continue building these skills together.\n\nFind a position that feels comfortable for your body. Choose a place where you feel safe and have as few distractions as possible. If at any point you feel uncomfortable, you can adjust your position or pause." 
      },
      { 
        id: 'thought-id', 
        title: 'Identify Thought', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'bothering_thought_s4', 
            text: "What thought is bothering you? (e.g., 'I am unsafe', 'It’s my fault', 'I am broken')", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'auditory-defusion', 
        title: 'Voice Changer Exercise', 
        type: 'exercise', 
        content: "Try these auditory defusion techniques with the thought you just identified:\n\n• **Silly Voice**: Repeat the scary thought in a cartoon or chipmunk voice (Donald Duck or Wall-E), or as a movie star, sports commentator, or robot.\n\n• **Slow and Fast**: Say your thought either silently or out loud—first very slowly, then at superfast speed.\n\n• **Singing**: Sing your thoughts either silently or out loud to the tune of 'Happy Birthday'. Then try it with a couple of different tunes." 
      },
      { 
        id: 'metaphor-choice', 
        title: 'Sky & Weather Metaphor', 
        type: 'exercise', 
        content: "Your thoughts and feelings are like the weather, always changing from moment to moment; sometimes pleasant and enjoyable; sometimes extremely unpleasant. But there’s a part of you that can step back and notice those thoughts and feelings—just like you’ve been doing in this exercise. And that part of you is a lot like the sky.\n\nThe sky always has room for the weather—no matter how bad it gets. The mightiest thunderstorm, the most turbulent hurricane, the most severe winter blizzard—these things cannot hurt the sky; and sooner or later the weather always changes. And sometimes we can’t see the sky—it’s obscured by clouds. But it’s still there. And even when they are thick, dark thunderclouds, if we rise high enough above them, sooner or later we’ll reach clear sky.\n\nSo more and more, when the emotional weather is bad, you can learn to take the perspective of the sky: to safely observe your thoughts and feelings; to open up and make room for them." 
      },
      { 
        id: 'chessboard-exercise', 
        title: 'The Chessboard Metaphor', 
        type: 'exercise', 
        content: "A chessboard has chess pieces of contrasting colours on each side of the board. On one side, we can imagine that the chess pieces are all of our pleasant and positive thoughts and feelings.\n\nOn the other side are all of our negative, unpleasant and distressing feelings and thoughts. There will be infinite numbers of pieces throughout our lives, just like there are endless thoughts and feelings that we experience across our lifetimes.\n\nImagine your mind is a chessboard. Thoughts are pieces. Notice the thought moving across the board. Notice them moving. You are the stable board. Observe it. Notice it without being controlled by it. You are stable. You are safe." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "This week, try to take the 'Sky Perspective' when difficult thoughts arise. Remember: you are the sky, not the weather." 
      }
    ]
  },
  { 
    number: 5, 
    title: 'Values Compass', 
    description: 'Identifying what truly matters to you and how you want to behave in different areas of your life.', 
    objective: 'Clarify core values and identify small steps toward a value-driven life.', 
    moduleKey: 'val',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Hello! I’m really glad to see you today. You have been putting effort into this process, and that is important. Every step you take, even small ones, shows growth. Today, we will continue building on the progress you’ve already made." 
      },
      { 
        id: 'check-in', 
        title: 'Check-in on Practice', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'practice_review_s5', 
            text: "While practicing the Chessboard or Sky and Weather exercise, what thoughts and feelings did you notice, and did reminding yourself that you are the observer (not your thoughts or feelings) make any difference?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'choose-domains', 
        title: 'Life Domains', 
        type: 'exercise', 
        content: "Values are about how you want to behave as a person. They are not about what you want to achieve, but about how you want to treat yourself, others, and the world.\n\nFirst, tap the domains of your life that have been disrupted by PTSD." 
      },
      { 
        id: 'rate-values', 
        title: 'Values Rating', 
        type: 'exercise', 
        content: "Now, choose one area of your life you want to improve. Read the list of values and rate each one:\n\nV = Very important\nQ = Quite important\nN = Not so important" 
      },
      { 
        id: 'card-sort', 
        title: 'Values Card Sort', 
        type: 'exercise', 
        content: "Your 'Very Important' values are shown below. Drag and reorder them based on your priorities for the life area you selected. Place the most important at the top." 
      },
      { 
        id: 'last-day-reflection', 
        title: 'Last Day Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'last_day_thought', 
            text: "Imagine this is your last day. What would matter most?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'avoided-domain', 
        title: 'Blocked Areas', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'blocked_domain', 
            text: "Which area of your life feels most blocked by trauma?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'small-step', 
        title: 'Identify a Small Step', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'tiny_step', 
            text: "Pick one tiny value-based step you can take today. (e.g., sending a kind message, speaking honestly, practicing patience, taking care of your health)", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'action-log', 
        title: 'Values Action Log', 
        type: 'exercise', 
        content: "This is your log to track your value-based actions." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "Homework: This week, take one small step every day based on the value you selected. After each step, write it in your Values Action Log." 
      }
    ]
  },
  { 
    number: 6, 
    title: 'Values & Clarification 1', 
    description: 'Exploring what truly matters in different domains of your life.', 
    objective: 'Complete the initial Values Compass assessment.', 
    moduleKey: 'val1',
    steps: [
      { id: 'intro', title: 'Your Internal Compass', type: 'intro', content: "Values are the directions we want to move in. They are not goals to be achieved, but ways of living. Like the North Star, they guide us even when the sea is rough." },
      { id: 'reflection-6', title: 'The 80th Birthday', type: 'reflection', content: "Imagine your 80th birthday. Someone who knows you well stands up to give a speech. What would you want them to say about what you stood for in your life?" },
      { 
        id: 'questions-6', 
        title: 'Domain Importance', 
        type: 'questionnaire',
        questions: [
          { id: 'q1', text: "How important is 'Family/Relationships' to you right now (1-10)?", type: 'likert' },
          { id: 'q2', text: "How important is 'Personal Growth/Health' to you (1-10)?", type: 'likert' },
          { id: 'q3', text: "Which domain feels most neglected due to your trauma symptoms?", type: 'text' }
        ]
      },
      { id: 'exercise-6', title: 'Values vs. Goals', type: 'exercise', content: "A goal is 'getting married'. A value is 'being loving'. You can be loving right now, even if you aren't married. Identify one value you can act on today." },
      { id: 'closing', title: 'Session Wrap-up', type: 'closing', content: "Reflect on one value you want to embody tomorrow. Just one. We'll build on this in Session 7." }
    ]
  },
  { 
    number: 7, 
    title: 'Committed Action', 
    description: 'Turning values into action through SMART goals and navigating barriers.', 
    objective: 'Build a SMART goal and map out a Choice Point for a challenging situation.', 
    moduleKey: 'val2',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Hello! I’m really glad to see you today. You have been putting effort into this process, and that is important. Every step you take, even small ones, shows growth. Today, we will continue building on the progress you’ve already made." 
      },
      { 
        id: 'reflection-s7', 
        title: 'Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'value_focus_last_week', 
            text: "Last week, you were supposed to take small actions to live according to your values. Which value did you focus on, and what action did you take to live that value?", 
            type: 'text' 
          },
          { 
            id: 'action_reflection', 
            text: "How did taking this action make you feel, and what did you learn about yourself?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'value-selection-s7', 
        title: 'Focus Area', 
        type: 'exercise', 
        content: "Which area and value will you focus on today? Choose from the values and life domains you identified previously." 
      },
      { 
        id: 'smart-goal-builder', 
        title: 'SMART Goal Builder', 
        type: 'exercise', 
        content: "Let's turn your value into a specific, small step using the SMART framework." 
      },
      { 
        id: 'barriers-s7', 
        title: 'Anticipate Barriers', 
        type: 'exercise', 
        content: "What thoughts, feelings, or triggers might get in the way of your goal?" 
      },
      { 
        id: 'choice-point-s7', 
        title: 'The Choice Point', 
        type: 'exercise', 
        content: "In any challenging situation, we have a choice: move 'Towards' the person we want to be, or 'Away' from them." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "Homework: This week, take one small step every day based on the value you selected. After each step, write it in your Values Action Log." 
      }
    ]
  },
  { 
    number: 8, 
    title: 'Exposure Through Values', 
    description: 'Moving toward difficult situations while staying connected to your values.', 
    objective: 'Create a value-based exposure hierarchy.', 
    moduleKey: 'exp',
    steps: [
      { id: 'intro', title: 'Facing the Fear', type: 'intro', content: "We don't face fears for the sake of it; we face them because our values are on the other side. Exposure is 'Willingness' in action." },
      { id: 'reflection-8', title: 'The Cost of Avoidance', type: 'reflection', content: "What have you missed out on in the last month because you were avoiding a difficult feeling or place?" },
      { 
        id: 'questions-8', 
        title: 'Exposure Planning', 
        type: 'questionnaire',
        questions: [
          { id: 'q1', text: "Identify a situation you avoid. What value is connected to it?", type: 'text' },
          { id: 'q2', text: "On a scale of 1-10, how difficult would it be to face this for 5 minutes?", type: 'likert' }
        ]
      },
      { id: 'exercise-8', title: 'The Values Anchor', type: 'exercise', content: "When you feel the urge to avoid, anchor yourself in your value. Repeat: \"I am willing to have this feeling because I value [Value Name]\"." },
      { id: 'closing', title: 'Session Wrap-up', type: 'closing', content: "Choose one 'willingness' moment for this week. A small one. We are building the muscle of courage." }
    ]
  },
  { 
    number: 9, 
    title: 'Trauma Narrative', 
    description: 'Integrating the past into a coherent story of growth and resilience.', 
    objective: 'Begin processing traumatic memories with a values-lens.', 
    moduleKey: 'trauma',
    steps: [
      { id: 'intro', title: 'Integrating the Past', type: 'intro', content: "Your trauma is part of your story, but it is not the whole story. Today we look at the narrative of your life with compassion and perspective." },
      { id: 'reflection-9', title: 'The Observer Self', type: 'reflection', content: "There is a part of you that has noticed everything you've ever experienced. This 'Observer Self' is unchanged by the trauma. Can you feel that steady presence?" },
      { 
        id: 'questions-9', 
        title: 'Growth & Resilience', 
        type: 'questionnaire',
        questions: [
          { id: 'q1', text: "What is one strength you've discovered in yourself during this recovery?", type: 'text' },
          { id: 'q2', text: "How has your perspective on your 'monster' changed since Session 1?", type: 'text' }
        ]
      },
      { id: 'exercise-9', title: 'The Life Line', type: 'exercise', content: "Imagine your life as a long line. The trauma is a point on that line, but the line continues far beyond it, guided by your values." },
      { id: 'closing', title: 'Session Wrap-up', type: 'closing', content: "You are more than what happened to you. You are the one who survived and the one who is growing. See you in Session 10." }
    ]
  },
  { 
    number: 10, 
    title: 'Grief & Forgiveness', 
    description: 'Processing loss and practicing compassion for yourself and others.', 
    objective: 'Practice self-compassion and forgiveness meditations.', 
    moduleKey: 'grief',
    steps: [
      { id: 'intro', title: 'Healing the Heart', type: 'intro', content: "Forgiveness isn't about letting others off the hook; it's about letting yourself off the hook from the weight of resentment. It's an act of self-kindness." },
      { id: 'reflection-10', title: 'The Weight of Guilt', type: 'reflection', content: "Is there something you are still blaming yourself for? If a dear friend was in your shoes, what would you say to them?" },
      { id: 'meditation-10', title: 'Self-Compassion Break', type: 'meditation', content: "Place a hand on your heart. Repeat: 'This is a moment of suffering. Suffering is part of life. May I be kind to myself in this moment'." },
      { 
        id: 'questions-10', 
        title: 'Compassion Check', 
        type: 'questionnaire',
        questions: [
          { id: 'q1', text: "How much self-blame are you carrying right now (1-10)?", type: 'likert' },
          { id: 'q2', text: "Are you willing to practice being a friend to yourself this week?", type: 'choice', options: ['Yes', 'I will try', 'Not yet'] }
        ]
      },
      { id: 'closing', title: 'Session Wrap-up', type: 'closing', content: "Be a friend to yourself this week. Notice the 'Inner Critic' and gently say 'I hear you, but I'm choosing kindness today'." }
    ]
  },
  { 
    number: 11, 
    title: 'Moral Injury', 
    description: 'Addressing wounds to the soul and navigating complex feelings of guilt and shame.', 
    objective: 'Identify moral conflict points and apply ACT flexibility.', 
    moduleKey: 'moral',
    steps: [
      { id: 'intro', title: 'Wounds of the Soul', type: 'intro', content: "Moral injury happens when our actions (or inactions) conflict with our deepest values. It's a deep wound, but it can be healed through values-reconnection." },
      { id: 'reflection-11', title: 'The Conflict', type: 'reflection', content: "Identify a moment where you felt your values were violated. What was the core value at stake? (e.g., Integrity, Protection, Justice)." },
      { 
        id: 'questions-11', 
        title: 'Restoring Values', 
        type: 'questionnaire',
        questions: [
          { id: 'q1', text: "How can you honor that value TODAY, in your current life?", type: 'text' },
          { id: 'q2', text: "What is one act of 'living amends' you can perform this week?", type: 'text' }
        ]
      },
      { id: 'exercise-11', title: 'The Values Bridge', type: 'exercise', content: "Imagine a bridge from the past to the present. You can't change the past side, but you can build the present side with the same values you feel were lost." },
      { id: 'closing', title: 'Session Wrap-up', type: 'closing', content: "Values are always available in the present moment. You can always choose to act on them now. See you for our final session." }
    ]
  },
  { 
    number: 12, 
    title: 'Relapse Prevention', 
    description: 'Building a sustainable plan for long-term psychological flexibility.', 
    objective: 'Create a "Flexibility Survival Kit" for future stressors.', 
    moduleKey: 'relapse',
    steps: [
      { id: 'intro', title: 'The Road Ahead', type: 'intro', content: "Recovery is a journey, not a destination. There will be bumps, detours, and storms. Today we prepare your 'Survival Kit' for the road ahead." },
      { id: 'reflection-12', title: 'Growth Review', type: 'reflection', content: "Look back at Session 1. What is the biggest change you've noticed in how you relate to your thoughts and feelings?" },
      { id: 'exercise-12', title: 'Survival Kit Mapping', type: 'exercise', content: "Identify your top 3 warning signs and the specific ACT skill you will use for each. (e.g., Nightmare -> Grounding, Self-Doubt -> Defusion)." },
      { 
        id: 'questions-12', 
        title: 'Future Commitment', 
        type: 'questionnaire',
        questions: [
          { id: 'q1', text: "How committed are you to continuing this practice (1-10)?", type: 'likert' },
          { id: 'q2', text: "What is your 'North Star' value that will keep you going?", type: 'text' }
        ]
      },
      { id: 'closing', title: 'Session Wrap-up', type: 'closing', content: "You have completed the core 12 sessions. You have the tools. You have the compass. Keep driving your bus toward your values!" }
    ]
  },
];
