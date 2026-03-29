/**
 * Database Seed Script - Clinical Template Edition
 * Run: npm run seed
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Clinic, User, AssessmentTemplate, SessionTemplate } from "./schema.js";
import dotenv from "dotenv"; // 1. Import dotenv

dotenv.config();


const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/act_path_db";

const OPTIONS_0_4 = [
  { label: "Not at all", value: 0 },
  { label: "A little bit", value: 1 },
  { label: "Moderately", value: 2 },
  { label: "Quite a bit", value: 3 },
  { label: "Extremely", value: 4 },
];

const OPTIONS_1_5 = [
  { label: "Almost Never", value: 1 },
  { label: "Sometimes", value: 2 },
  { label: "Half the Time", value: 3 },
  { label: "Most of Time", value: 4 },
  { label: "Almost Always", value: 5 },
];

const OPTIONS_AAQ = [
  { label: "Never true", value: 1 },
  { label: "Very seldom true", value: 2 },
  { label: "Seldom true", value: 3 },
  { label: "Sometimes true", value: 4 },
  { label: "Frequently true", value: 5 },
  { label: "Almost always true", value: 6 },
  { label: "Always true", value: 7 },
];

export const THERAPY_SESSIONS= [
  { 
    number: 1, 
    title: 'Creative Hopelessness', 
    description: 'Examining the agenda of control and identifying what is truly workable in your recovery journey.', 
    objective: 'Identify the "workability" of current coping strategies and the cost of the struggle.', 
    moduleKey: 'ch',
    audioUrl: '/audio/s1_intro.mp3',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Welcome to your first session. Thank you for taking part. This session is designed to support your well-being. Find a position that feels comfortable for your body. Choose a place where you feel safe and have as few distractions as possible. If at any point you feel uncomfortable, you can adjust your position or pause." 
      },
      { 
        id: 'instructions-workability', 
        title: 'Workability Check', 
        type: 'questionnaire',
        content: "Before we begin, please remember:\n• There are no right or wrong answers.\n• Take your time, go at your own pace.\n• Your responses help us understand you better.",
        questions: [
          { 
            id: 'q1', 
            text: "What do you do when pain shows up?", 
            type: 'multiselect', 
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
    audioUrl: '/audio/s2_intro.mp3',
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
        audioUrl: '/audio/leaves_on_stream.mp3',
        content: "Sit in a comfortable position and either close your eyes or rest them gently on a fixed spot in the room. Visualise yourself sitting beside a gently flowing stream with leaves floating along the surface of the water. (Pause 10 seconds).\n\nFor the next few minutes, take each thought that enters your mind and place it on a leaf… let it float by. Do this with each thought – pleasurable, painful, or neutral. Even if you have joyous or enthusiastic thoughts, place them on a leaf and let them float by. If your thoughts momentarily stop, continue to watch the stream. Sooner or later, your thoughts will start up again. (Pause 20 seconds).\n\nAllow the stream to flow at its own pace. Don’t try to speed it up and rush your thoughts along. You’re not trying to rush the leaves along or “get rid” of your thoughts. You are allowing them to come and go at their own pace. If your mind says “This is dumb,” “I’m bored,” or “I’m not doing this right” place those thoughts on leaves, too, and let them pass. (Pause 20 seconds).\n\nIf a leaf gets stuck, allow it to hang around until it’s ready to float by. If the thought comes up again, watch it float by another time. (Pause 20 seconds).\n\nIf a difficult or painful feeling arises, simply acknowledge it. Say to yourself, “I notice myself having a feeling of boredom/impatience/frustration.” Place those thoughts on leaves and allow them to float along. From time to time, your thoughts may hook you and distract you from being fully present in this exercise. This is normal. As soon as you realise that you have become sidetracked, gently bring your attention back to the visualisation exercise." 
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
    audioUrl: '/audio/s3_intro.mp3',
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
    audioUrl: '/audio/s4_intro.mp3',
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
    title: 'Observe & Ground', 
    description: 'Learning to observe difficult thoughts and use the 5-4-3-2-1 grounding technique.', 
    objective: 'Develop skills to unhook from bothering thoughts and stay present during distress.', 
    moduleKey: 'obs_grnd',
    audioUrl: '/audio/s5_intro.mp3',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome Back', 
        type: 'intro', 
        content: "Hello! I’m glad you are here today. I appreciate the effort you are making in practicing the exercises. Even small steps are important progress. Today, we will continue building these skills together." 
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
        id: 'identify-thought', 
        title: 'Observe Your Thoughts', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'bothering_thought', 
            text: "What thought is bothering you right now? (e.g., 'I am unsafe', 'It's my fault', 'I am broken')", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'visual-defusion-s5', 
        title: 'Visualizing the Thought', 
        type: 'exercise', 
        content: "Notice how the thought changes when you see it in different ways. This helps you unhook from the literal meaning and see it as just words." 
      },
      { 
        id: 'grounding-54321', 
        title: '5-4-3-2-1 Grounding', 
        type: 'exercise', 
        content: "We will now practice a technique to bring you back to the present moment." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "Homework: Practice using the ‘Ground Me Now’ button every day this week. Even if you feel calm, use it once daily to build the habit, and use it anytime you feel stressed, anxious, or overwhelmed." 
      }
    ]
  },
  { 
    number: 6, 
    title: 'Values Compass', 
    description: 'Identifying what truly matters to you and how you want to behave in different areas of your life.', 
    objective: 'Clarify core values and identify small steps toward a value-driven life.', 
    moduleKey: 'val2',
    audioUrl: '/audio/s6_intro.mp3',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Welcome back! Today we are going to build your 'Values Compass'—a detailed map of what matters to you in different areas of your life." 
      },
      { 
        id: 'check-in', 
        title: 'Check-in on Practice', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'practice_review_s6', 
            text: "Last week we talked about the 80th birthday reflection. Did any particular value stand out to you since then?", 
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
    number: 7, 
    title: 'Committed Action', 
    description: 'Turning values into action through SMART goals and navigating barriers.', 
    objective: 'Build a SMART goal and map out a Choice Point for a challenging situation.', 
    moduleKey: 'val2',
    audioUrl: '/audio/s7_intro.mp3',
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
    title: 'Value-Guided Exposure', 
    description: 'Approaching avoided situations while staying connected to your values.', 
    objective: 'Plan a small exposure step and prepare ACT skills for the challenge.', 
    moduleKey: 'exp',
    audioUrl: '/audio/s8_intro.mp3',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Hello! I’m really glad to see you today. You have been putting effort into this process, and that is important. Every step you take, even small ones, shows growth. Today, we will continue building on the progress you’ve already made." 
      },
      { 
        id: 'reflection-s8', 
        title: 'Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'value_focus_last_week_s8', 
            text: "Last week, you were supposed to take small actions to live according to your values. Which value did you focus on, and what action did you take to live that value?", 
            type: 'text' 
          },
          { 
            id: 'action_reflection_s8', 
            text: "How did taking this action make you feel, and what did you learn about yourself?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'choose-values-s8', 
        title: 'Choose Values', 
        type: 'exercise', 
        content: "Select the values you want to guide you through this exposure." 
      },
      { 
        id: 'select-avoided-situation', 
        title: 'Avoided Situation', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'avoided_situation', 
            text: "Which avoided situation will you approach? (e.g., going to a Crowded Place, talking to a Stranger, visiting a Specific Place, avoiding a Specific Person)", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'plan-exposure-step', 
        title: 'Plan Small Step', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'exposure_step', 
            text: "What is one small step you can safely take? (e.g., Send a text, walk past a street, enter a room for 1 minute)", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'prepare-act-skills', 
        title: 'Prepare ACT Skills', 
        type: 'exercise', 
        content: "Before you take this step, let's prepare your ACT toolkit." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "Great work today. This week, try to take that small exposure step you planned. Notice what happens when you move toward what matters, even when it's difficult." 
      }
    ]
  },
  { 
    number: 9, 
    title: 'Trauma Narrative & Compassion', 
    description: 'Integrating the past into a coherent story of growth and resilience.', 
    objective: 'Begin processing traumatic memories with a values-lens and self-compassion.', 
    moduleKey: 'trauma',
    audioUrl: '/audio/s9_intro.mp3',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Hello! I’m really glad to see you today. You have been putting effort into this process, and that is important. Every step you take, even small ones, shows growth. Today, we will continue building on the progress you’ve already made." 
      },
      { 
        id: 'reflection-s9', 
        title: 'Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'value_focus_last_week_s9', 
            text: "Last week, you were supposed to take small actions to live according to your values. Which value did you focus on, and what action did you take to live that value?", 
            type: 'text' 
          },
          { 
            id: 'action_reflection_s9', 
            text: "How did taking this action make you feel, and what did you learn about yourself?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'safe-prep-s9', 
        title: 'Safe Preparation', 
        type: 'intro', 
        content: "You will gently explore your memory in a safe way. You can stop at any time. Remember to use your grounding, defusing, and acceptance skills if things feel overwhelming." 
      },
      { 
        id: 'guided-writing-s9', 
        title: 'Guided Writing', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'trauma_narrative', 
            text: "Write a short paragraph about the experience. You can focus on the facts, the emotions you felt, or the physical sensations in your body.", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'compassionate-talk-s9', 
        title: 'Compassionate Self-Talk', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'kind_things', 
            text: "Write three kind things to say to yourself about this experience. What would you say to a friend in your situation?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'two-mountains-s9', 
        title: 'Two Mountains Visualization', 
        type: 'exercise', 
        content: "Imagine there are two mountains. One is the Mountain of Pain, where all your difficult memories, thoughts, and feelings live. The other is the Mountain of Values, representing the person you want to be and the things that matter to you. Often, we feel stuck on the Mountain of Pain, trying to fight our way off it or hide from it.\n\nBut imagine standing in the valley between these two mountains. You can see the pain, and you can also see your values. You don't have to conquer the Mountain of Pain to start climbing the Mountain of Values. You can acknowledge the pain is there, and still take a step toward what matters. Notice what it feels like to have both in your view at the same time." 
      },
      { 
        id: 'compassion-letter-s9', 
        title: 'Self-Compassion Letter', 
        type: 'exercise', 
        content: "Imagine a dear friend who has gone through exactly what you have experienced. They are feeling the same pain, the same guilt, or the same shame. What would you say to them? How would your voice sound? What kind of support would you offer?\n\nNow, try to write those same words to yourself. Acknowledge your suffering with kindness. Remind yourself that you are not alone in your pain—that many others feel this way too. Offer yourself words of validation and support. 'I see how hard this has been for you.' 'You are doing the best you can.' 'You deserve kindness.' Allow these words to land in your heart." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "You are more than what happened to you. You are the one who survived and the one who is growing. Be gentle with yourself this week." 
      }
    ]
  },
  { 
    number: 10, 
    title: 'Grief and Forgiveness', 
    description: 'Processing loss and releasing the weight of the past.', 
    objective: 'Practice self-forgiveness and learn to carry grief with values.', 
    moduleKey: 'grief',
    audioUrl: '/audio/s10_intro.mp3',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Hello! I’m really glad to see you today. You have been putting effort into this process, and that is important. Every step you take, even small ones, shows growth. Today, we will continue building on the progress you’ve already made." 
      },
      { 
        id: 'reflection-s10', 
        title: 'Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'value_focus_last_week_s10', 
            text: "Last week, you were supposed to take small actions to live according to your values. Which value did you focus on, and what action did you take to live that value?", 
            type: 'text' 
          },
          { 
            id: 'action_reflection_s10', 
            text: "How did taking this action make you feel, and what did you learn about yourself?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'grief-forgiveness-meditation', 
        title: 'Grief and Forgiving', 
        type: 'exercise', 
        content: "Find a comfortable position. Close your eyes or soften your gaze. Take a few deep breaths. Bring to mind a loss or a hurt that you are carrying. It might be a recent event or something from long ago. Notice where you feel this in your body. Is it a tightness in your chest? A heaviness in your stomach? Acknowledge this feeling. Silently say to yourself, 'This is grief. This is pain.'\n\nNow, imagine this pain as a heavy object you are holding. Notice how much energy it takes to keep a tight grip on it. Consider the possibility of forgiveness—not as an excuse for what happened, but as a way to set yourself free. Imagine slowly loosening your grip. You don't have to let go completely yet. Just notice the space that opens up when you stop fighting the pain. Breathe into that space. When you are ready, gently bring your attention back to the room." 
      },
      { 
        id: 'forgiveness-exploration', 
        title: 'Explore Forgiveness', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'willingness_to_release', 
            text: "Forgiveness means choosing not to carry the weight of anger or blame forever. Are you willing to loosen your grip on this pain, even a little?", 
            type: 'text' 
          },
          { 
            id: 'choose_to_heal', 
            text: "If it feels right, you may say: 'I choose to release what I can, at my own pace. I allow myself to heal.'", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'moving-forward-values', 
        title: 'Moving Toward Values', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'desired_self', 
            text: "What kind of person do you want to be, even with this grief? (e.g., loving, strong, peaceful, compassionate)", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'self-acceptance', 
        title: 'Self Acceptance', 
        type: 'exercise', 
        content: "Sit comfortably and, if it feels safe, gently close your eyes or lower your gaze. Take a slow breath in… and slowly breathe out. Feel your feet on the ground and notice that you are here, in this moment, and safe right now. Notice three things you can see, two things you can feel in your body, and one sound you can hear. Let your body settle.\n\nNow gently bring awareness to the hurt or loss you have experienced. You do not need to go into details. Just acknowledge the impact. Notice what emotions are present — sadness, anger, fear, disappointment, or something else. Silently say to yourself, “This hurt me.” “What happened was painful.” Allow your feelings to be real and valid. There is nothing wrong with you for feeling this way.\n\nAs thoughts appear, such as “I am broken” or “I will never heal,” gently create a little space from them. Say, “I am noticing the thought that I am broken.” Notice that you are the one observing the thought. You are not the trauma. You are not the pain. You are the person who has survived it.\n\nNow gently consider forgiveness. Forgiveness does not mean saying what happened was okay. It does not mean forgetting. It does not mean allowing harm again. Forgiveness, if you choose it, is about freeing yourself from carrying the heavy weight of anger or resentment forever. Ask yourself softly, “Am I willing to loosen my grip on this pain, even a little?” There is no pressure. You can move at your own pace.\n\nShift your focus toward yourself. You might say, “I deserve peace.” “I choose to move toward healing.” “I may still feel pain, but I do not want this pain to control my future.” Notice what kind of person you want to be moving forward — strong, compassionate, boundaried, courageous. Even with grief present, you can take small steps toward these values.\n\nTake one more slow breath in… and slowly breathe out. Feel the ground beneath you. Notice the room around you. When you are ready, gently open your eyes. Remember, healing does not mean forgetting. It means learning to carry your story with strength while choosing the direction of your life."
      },
      { 
        id: 'forgiving-yourself', 
        title: 'Forgiving Yourself', 
        type: 'exercise', 
        content: "Sit comfortably and gently close your eyes if that feels safe, or soften your gaze. Take a slow breath in… and slowly breathe out. Feel your feet on the ground and notice your body supported by the chair or floor. You are here, in this moment.\n\nBring to mind something you feel guilty about, regret, or blame yourself for. Do not go into full details — just notice the feeling connected to it. You might feel heaviness, tightness, or discomfort. Silently say, ‘I am noticing guilt.’ or ‘I am noticing shame.’ Allow the feeling to be there without pushing it away.\n\nNow notice the thoughts that come with it, such as ‘I should have done better’ or ‘It’s my fault.’ Instead of arguing with the thoughts, gently say, ‘I am noticing the thought that I failed.’ Create a little space between you and the thought. Thoughts are not facts — they are mental events.\n\nPlace your hand gently on your chest if that feels okay. Take a slow breath. Remind yourself: ‘I am human. Humans make mistakes. I am allowed to learn and grow.’ Self-forgiveness does not mean denying responsibility. It means accepting that you cannot change the past, but you can choose how you move forward. Ask yourself softly, ‘What would I say to a friend who made this mistake?’ Notice the kindness you would offer them. Now gently offer the same kindness to yourself.\n\nYou might say:\n• “I forgive myself for not knowing what I know now.”\n• “I am learning.”\n• “I choose growth over self-punishment.”\n\nFeel the possibility of releasing just a small amount of self-judgment. Not all at once — just a little. Take one more slow breath in… and out. Notice your body again, the room around you. When you are ready, gently open your eyes. Remember, self-forgiveness is a process. It is a choice to treat yourself with compassion while continuing to grow." 
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "Grief is love that still exists. Forgiveness is a step toward your own freedom. Take these insights with you this week." 
      }
    ]
  },
  { 
    number: 11, 
    title: 'Moral Injury', 
    description: 'Addressing wounds to the soul and navigating complex feelings of guilt and shame.', 
    objective: 'Identify moral conflict points and apply ACT flexibility.', 
    moduleKey: 'moral',
    audioUrl: '/audio/s11_intro.mp3',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Hello! I’m really glad to see you today. You have been putting effort into this process, and that is important. Every step you take, even small ones, shows growth. Today, we will continue building on the progress you’ve already made." 
      },
      { 
        id: 'reflection-s11', 
        title: 'Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'value_focus_last_week_s11', 
            text: "Last week, you were supposed to take small actions to live according to your values. Which value did you focus on, and what action did you take to live that value?", 
            type: 'text' 
          },
          { 
            id: 'action_reflection_s11', 
            text: "How did taking this action make you feel, and what did you learn about yourself?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'moral-injury-intro', 
        title: 'Wounds of the Soul', 
        type: 'exercise', 
        content: "Moral injury is like a deep wound to the soul. it happens when we witness or participate in events that go against our most deeply held beliefs about what is right and wrong. This can lead to intense feelings of guilt, shame, and a sense of being 'broken' or 'beyond repair'.\n\nTake a moment to acknowledge this wound without judgment. It is a sign that you have a strong moral compass—that you care deeply about what is right. Healing doesn't mean forgetting or saying it was okay. It means learning to carry this story with integrity and choosing to act in line with your values from this moment forward." 
      },
      { 
        id: 'struggle-switch-s11', 
        title: 'The Struggle Switch', 
        type: 'exercise', 
        content: "Remember the 'Struggle Switch' from Session 3? When it comes to moral injury, we often have the switch flipped to 'ON'. We struggle against the guilt, we fight the shame, and we try to push away the painful memories. But this struggle only creates more suffering.\n\nImagine gently reaching for that switch and flipping it to 'OFF'. This doesn't mean the guilt or shame goes away. It means you stop fighting them. You allow them to be there, like a heavy backpack you are carrying, while you continue to walk toward your values. Notice the energy you save when you stop the internal war." 
      },
      { 
        id: 'cognitive-defusion-s11', 
        title: 'Cognitive Defusion', 
        type: 'exercise', 
        content: "When we experience moral injury, our mind often hooks us with harsh labels: 'I am a bad person,' 'I am a monster,' 'I don't deserve to be happy.' These thoughts feel like absolute truths. But remember: they are just thoughts—words and images in your mind.\n\nTry using the 'I am noticing the thought that...' technique. Instead of 'I am a bad person,' say 'I am noticing the thought that I am a bad person.' Notice the space this creates. You are the observer of the thought, not the thought itself. You are the sky, and these judgments are just dark clouds passing through." 
      },
      { 
        id: 'moving-forward-s11', 
        title: 'Moving Forward', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'desired_self_s11', 
            text: "What kind of person do you want to be moving forward? (e.g., Integrity, Compassion, Responsibility, Service, Repair)", 
            type: 'text' 
          },
          { 
            id: 'small_action_s11', 
            text: "What is one small action you can take this week that moves you toward your values? (e.g., making amends, helping someone, setting boundaries, practicing self-compassion)", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'closing', 
        title: 'Session Wrap-up', 
        type: 'closing', 
        content: "You are allowed to grow. You are allowed to act in line with your values from this moment forward. Be gentle with yourself." 
      }
    ]
  },
  { 
    number: 12, 
    title: 'Prepare for Setbacks & Build Resilience', 
    description: 'Building a sustainable plan for long-term psychological flexibility.', 
    objective: 'Create a "Flexibility Survival Kit" and internalize the Bus Metaphor.', 
    moduleKey: 'relapse',
    steps: [
      { 
        id: 'intro', 
        title: 'Welcome', 
        type: 'intro', 
        content: "Welcome to our final session! You have come so far. Today is about preparing for the road ahead, ensuring you have the tools to stay on track even when the journey gets bumpy." 
      },
      { 
        id: 'reflection-s12', 
        title: 'Reflection', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'growth_reflection_s12', 
            text: "Looking back at Session 1, what is the biggest change you've noticed in how you relate to your thoughts and feelings?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'identify-triggers-s12', 
        title: 'Identify Triggers', 
        type: 'exercise', 
        content: "Recognizing what sets off your distress is the first step in managing it." 
      },
      { 
        id: 'warning-signs-s12', 
        title: 'Warning Signs', 
        type: 'exercise', 
        content: "Identifying early signs of PTSD symptoms returning." 
      },
      { 
        id: 'act-skills-review-s12', 
        title: 'ACT Skills Review', 
        type: 'exercise', 
        content: "Reviewing your toolkit and matching skills to triggers." 
      },
      { 
        id: 'passengers-on-bus-s12', 
        title: 'Passengers on the Bus', 
        type: 'exercise', 
        content: "Imagine your life is a bus, and you are the driver. You have a destination in mind—your values. But as you drive, various 'passengers' get on the bus. These passengers are your difficult thoughts, painful memories, and uncomfortable feelings. Some of them are loud and scary. They might shout, 'You're going the wrong way!' or 'You'll never make it!' They might even try to grab the steering wheel.\n\nOften, we spend all our time trying to argue with these passengers, or trying to kick them off the bus. But while we're doing that, the bus isn't moving toward our destination. What if you just let the passengers stay? They can shout all they want, but they don't have to drive the bus. You are the driver. You can acknowledge their presence, and still keep the bus moving toward what matters to you." 
      },
      { 
        id: 'relapse-prevention-plan-s12', 
        title: 'Resilience Plan Builder', 
        type: 'exercise', 
        content: "Creating your personalized survival kit for the future." 
      },
      { 
        id: 'check-in-s12', 
        title: 'Daily/Weekly Check-In', 
        type: 'questionnaire',
        questions: [
          { 
            id: 'triggers_occurred_s12', 
            text: "Did any triggers occur this week?", 
            type: 'choice',
            options: ['Yes', 'No']
          },
          { 
            id: 'skills_used_s12', 
            text: "Which skills did you use, and what worked or needs adjustment?", 
            type: 'text' 
          }
        ]
      },
      { 
        id: 'closing', 
        title: 'Final Wrap-up', 
        type: 'closing', 
        content: "You have completed the core 12 sessions. You have the tools. You have the compass. Keep driving your bus toward your values! Remember, you are the driver." 
      }
    ]
  },
]

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB at ${MONGO_URI} for clinical template seeding...`);

    // Clear existing data
    // await Clinic.deleteMany({});
    // await User.deleteMany({});
    // await AssessmentTemplate.deleteMany({});
    // await SessionTemplate.deleteMany({});

    console.log("Cleared old data.");

    const salt = await bcrypt.genSalt(10);
    //const hashedPassword = await bcrypt.hash("password123", salt);
    const therapisthashedPassword = await bcrypt.hash("lubnadar@123", salt);

    //Updation of therapist without affecting other collections

    const mainClinic = await Clinic.findOne({ contactEmail: "admin@centralwellnesss.com" });

    if (!mainClinic) {
      console.warn("Warning: Main clinic not found. Therapist will be created without a clinicId. Run the full seed first if you need the clinic.");
    }

    // 2. Safely Update or Insert (Upsert) ONLY the therapist
    const updatedTherapist = await User.findOneAndUpdate(
      { email: "sarah@clinic.com" }, // Look for this specific user
      {
        $set: {
          name: "Dr. Lubna Dar",
          email: "Surveydatacollection7@gmail.com",
          password: therapisthashedPassword,
        }
      },
      { new: true } // 'upsert' creates the user if they don't exist
    );

    if (updatedTherapist) {
      console.log("Successfully updated the therapist account!");
      console.log(`New Name:  ${updatedTherapist.name}`);
      console.log(`New Email: ${updatedTherapist.email}`);
    } else {
      console.log("Could not find a user with the email 'sarah@clinic.com'. Please double-check the exact spelling in your database.");
    }
    
    process.exit(0);
  }catch (error) {
    console.error("Error updating therapist:", error);
    process.exit(1);
  }

  // If you want to run the full seed (including clinic and templates), you can uncomment the following code and run it once. Just be cautious as it will clear existing data.

    // ── 1. Seed Clinic ──────────────────────────────────────────────────────
  //   const mainClinic = await Clinic.create({
  //     name: "Central Wellness Clinic",
  //     contactEmail: "admin@centralwellnesss.com",
  //     role:"ADMIN",
  //     usersCount:100,
  //     password: hashedPassword,
  //     plan: "Professional",
  //     status: "Live",
  //   });

  //   // ── 2. Seed Assessment Templates ────────────────────────────────────────

  //   const pdeqQuestions = [
  //     'I "blanked out" or "spaced out" or in some way felt that I was not part of what was going on.',
  //     "Things seemed to be happening in slow motion (very slowly).",
  //     "What was happening didn't seem real, like I was in a dream or watching a movie.",
  //     "I felt like I was watching what was happening to me, like I was floating above the scene or watching it as an outsider (from the outside looking in).",
  //     "I felt separate or disconnected from my body or like my body was unusually large or small (not normal size—too large or too small).",
  //     "Things happened that I didn't notice, even though I normally would have noticed them.",
  //     "I felt confused or couldn't make sense of what was happening.",
  //     "There were moments when I wasn't sure about where I was or what time it was.",
  //   ].map((text, i) => ({ id: `q${i + 1}`, text, type: "LIKERT", options: OPTIONS_1_5 }));

  //   await AssessmentTemplate.create({
  //     code: "PDEQ-V1",
  //     title: "Peritraumatic Dissociative Experiences Questionnaire (PDEQ)",
  //     description: "Assesses dissociative experiences during or immediately after trauma.",
  //     questions: pdeqQuestions,
  //   });

  //   const pcl5Questions = [
  //     "Repeated, disturbing, and unwanted memories of the stressful experience?",
  //     "Repeated, disturbing dreams of the stressful experience?",
  //     "Suddenly feeling or acting as if the stressful experience were actually happening again?",
  //     "Feeling very upset when something reminded you of the stressful experience?",
  //     "Having strong physical reactions when something reminded you of the stressful experience?",
  //     "Avoiding memories, thoughts, or feelings related to the stressful experience?",
  //     "Avoiding external reminders of the stressful experience?",
  //     "Trouble remembering important parts of the stressful experience?",
  //     "Having strong negative beliefs about yourself, other people, or the world?",
  //     "Blaming yourself or someone else for the stressful experience?",
  //     "Having strong negative feelings such as fear, horror, anger, guilt, or shame?",
  //     "Loss of interest in activities that you used to enjoy?",
  //     "Feeling distant or cut off from other people?",
  //     "Trouble experiencing positive feelings?",
  //     "Irritable behavior, angry outbursts, or acting aggressively?",
  //     "Taking too many risks or doing things that could cause you harm?",
  //     'Being "superalert" or watchful or on guard?',
  //     "Feeling jumpy or easily startled?",
  //     "Having difficulty concentrating?",
  //     "Trouble falling or staying asleep?",
  //   ].map((text, i) => {
  //     let cluster = "";
  //     if (i < 5) cluster = "B";
  //     else if (i < 7) cluster = "C";
  //     else if (i < 14) cluster = "D";
  //     else cluster = "E";
  //     return { id: `q${i + 1}`, text, type: "LIKERT", options: OPTIONS_0_4, cluster };
  //   });

  //   const pcl5Template = await AssessmentTemplate.create({
  //     code: "PCL5-V1",
  //     title: "PTSD Checklist for DSM-5",
  //     description: "Standard clinical assessment for PTSD severity.",
  //     questions: pcl5Questions,
  //   });

  //   const dersQuestions = [
  //     "I pay attention to how I feel",
  //     "I have no idea how I am feeling",
  //     "I have difficulty making sense out of my feelings",
  //     "I care about what I am feeling",
  //     "I am confused about how I feel",
  //     "When I'm upset, I acknowledge my emotions",
  //     "When I'm upset, I become embarrassed for feeling that way",
  //     "When I'm upset, I have difficulty getting work done",
  //     "When I'm upset, I become out of control",
  //     "When I'm upset, I believe that I will end up feeling very depressed",
  //     "When I'm upset, I have difficulty focusing on other things",
  //     "When I'm upset, I feel guilty for feeling that way",
  //     "When I'm upset, I have difficulty concentrating",
  //     "When I'm upset, I have difficulty controlling my behaviors",
  //     "When I'm upset, I believe there is nothing I can do to make myself feel better",
  //     "When I'm upset, I become irritated with myself for feeling that way",
  //     "When I'm upset, I lose control over my behavior",
  //     "When I'm upset, it takes me a long time to feel better",
  //   ].map((text, i) => ({ id: `q${i + 1}`, text, type: "LIKERT", options: OPTIONS_1_5 }));

  //   await AssessmentTemplate.create({
  //     code: "DERS18-V1",
  //     title: "Emotion Regulation (DERS-18)",
  //     description: "Assessment of emotional awareness and regulation strategies.",
  //     questions: dersQuestions,
  //   });

  //   const aaqQuestions = [
  //     "My painful experiences and memories make it difficult for me to live a life that I would value.",
  //     "I'm afraid of my feelings.",
  //     "I worry about not being able to control my worries and feelings.",
  //     "My painful memories prevent me from having a fulfilling life.",
  //     "Emotions cause problems in my life.",
  //     "It seems like most people are handling their lives better than I am.",
  //     "Worries get in the way of my success.",
  //   ].map((text, i) => ({ id: `q${i + 1}`, text, type: "LIKERT", options: OPTIONS_AAQ }));

  //   const redFlagQuestions = [
  //     "Have you had thoughts about hurting yourself?",
  //     "Have you had thoughts about ending your life?",
  //     "Have you ever tried to end your life?",
  //     "Have you had thoughts about hurting someone else?",
  //     "Have you ever hurt yourself on purpose?"
  //   ].map((text, i) => ({ id: `q${i + 1}`, text, type: "LIKERT", options: [] }));

  //   await AssessmentTemplate.create({
  //     code: "AAQ-V1",
  //     title: "Psychological Inflexibility (AAQ-II)",
  //     description: "Measures experiential avoidance and psychological inflexibility.",
  //     questions: aaqQuestions,
  //   });

  //   await AssessmentTemplate.create({
  //     code: "REDFLAG-V1",
  //     title: "Safety Assessment",
  //     description: "Assessment of safety, self-harm, and risk factors.",
  //     questions: redFlagQuestions,
  //   });

    
  //   const sessionTemplatesToInsert = THERAPY_SESSIONS.map(session => ({
  //     sessionNumber: session.number,
  //     title: session.title,
  //     description: session.description,
  //     objective: session.objective,
  //     moduleKey: session.moduleKey,
  //     audioUrl: session.audioUrl,
  //     steps: session.steps.map(step => ({
  //       stepId: step.id, 
  //       title: step.title,
  //       type: step.type.toUpperCase(), // Normalize for the backend
  //       content: step.content,
  //       questions: step.questions ? step.questions.map(q => ({
  //         questionId: q.id,
  //         text: q.text,
  //         type: q.type.toUpperCase(),
  //         options: q.options || []
  //       })) : []
  //     }))
  //   }));

  //   await SessionTemplate.create(sessionTemplatesToInsert);
  //   console.log("Session templates seeded with descriptions and full question definitions.");

  //   // ── 4. Seed Test Client ──────────────────────────────────────────────────
  //   const testClient = {
  //     name: "Clinical Test Account",
  //     email: "test@actpath.com",
  //     password: hashedPassword,
  //     role: "CLIENT",
  //     clinicId: mainClinic._id,
  //     hasConsented: true,
  //     consentTimestamp: new Date(),
  //     currentSession: 2,

  //     intakeResponses: [
  //       { questionId: "age",          questionText: "What is your current age?",         value: 32 },
  //       { questionId: "trauma-near-death", questionText: "Have you had a near death experience?", value: true, label: "Yes" },
  //     ],

  //     assessmentHistory: [
  //       {
  //         templateId: pcl5Template._id,
  //         testType: "PCL5",
  //         totalScore: 42,
  //         items: [
  //           { questionId: "q1", questionText: "Repeated, disturbing, and unwanted memories...", value: 3, label: "Quite a bit" },
  //           { questionId: "q2", questionText: "Repeated, disturbing dreams...",                  value: 2, label: "Moderately" },
  //         ],
  //       },
  //     ],

  //     sessionHistory: [
  //       {
  //         sessionNumber: 1,
  //         sessionTitle: "Creative Hopelessness",
  //         status: "COMPLETED",
  //         totalDurationMinutes: 22,
  //         distressBefore: 3,
  //         distressAfter: 4,
  //         reflections: { coreCost: "Social Isolation" },
  //         stepProgress: [
  //           { stepId: "avoidance-q", status: "COMPLETED", startTime: new Date(Date.now() - 100000) },
  //         ],
  //       },
  //     ],

  //     currentClinicalSnapshot: {
  //       lastDistress: 3,
  //       pcl5Total: 42,
  //       lastUpdate: new Date(),
  //     },
  //   };

  //   await User.create(testClient);

  //   // ── 5. Seed Staff ────────────────────────────────────────────────────────
  //   await User.insertMany([
  //     {
  //       name: "Dr. Lubna Dar",
  //       email: "Surveydatacollection7@gmail.com",
  //       password: therapisthashedPassword,
  //       role: "THERAPIST",
  //       clinicId: mainClinic._id,
  //       hasConsented: true,
  //     },
  //     {
  //       name: "System Admin",
  //       email: "super@actsaas.com",
  //       password: hashedPassword,
  //       role: "SUPER_ADMIN",
  //       hasConsented: true,
  //     },

  //   ]);

  //   console.log("Database seeded with clinical templates and question-aware data!");
  //   process.exit(0);
  // } catch (error) {
  //   console.error("Error seeding database:", error);
  //   process.exit(1);
  // }
}

seedDatabase();