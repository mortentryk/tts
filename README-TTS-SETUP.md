# 🎙️ TTS Setup Guide

## OpenAI TTS (Recommended)

**Quality**: Excellent, very natural voices  
**Cost**: $0.015 per 1K characters (~$0.15 per 10K characters)  
**Setup**: Very easy  

### Setup Steps:
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Click "Create new secret key"
4. Copy the API key
5. Add to your environment variables:

```bash
# In your .env.local file (create it in the project root)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Available Voices:
- `alloy` - Neutral, balanced
- `echo` - Male, clear
- `fable` - British accent
- `onyx` - Deep, male
- `nova` - Female, warm
- `shimmer` - Female, soft

## LMNT TTS (Alternative)

**Quality**: Very good  
**Cost**: $5/month for 10K characters  
**Setup**: Easy  

### Setup Steps:
1. Go to [LMNT.com](https://lmnt.com/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add to your environment variables:

```bash
# In your .env.local file
LMNT_API_KEY=your-lmnt-api-key-here
```

## Environment Variables

Create a `.env.local` file in your project root with:

```bash
# Choose one or both
OPENAI_API_KEY=sk-your-openai-api-key-here
LMNT_API_KEY=your-lmnt-api-key-here
```

## Usage

The game will automatically:
1. Try OpenAI TTS first (if API key is available)
2. Fall back to LMNT TTS (if OpenAI fails)
3. Fall back to local Web Speech API (if both fail)

You can switch between providers using the buttons in the game interface.

## Cost Estimation

For a typical dungeon story game:
- **OpenAI**: ~$0.50-2.00 per playthrough
- **LMNT**: $5/month unlimited (if under 10K characters)

OpenAI is usually the most cost-effective for casual use.
