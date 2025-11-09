import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// PUT - Update a character
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const body = await request.json();
    const { 
      name, 
      description, 
      referenceImageUrl, 
      appearancePrompt 
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update character
    const { data: character, error: characterError } = await supabaseAdmin
      .from('characters')
      .update({
        name,
        description: description || null,
        reference_image_url: referenceImageUrl || null,
        appearance_prompt: appearancePrompt || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', characterId)
      .select()
      .single() as any;

    if (characterError) {
      return NextResponse.json(
        { error: `Failed to update character: ${characterError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      character,
    });

  } catch (error) {
    console.error('❌ Character update error:', error);
    return NextResponse.json(
      { error: `Failed to update character: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a character
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;

    // Delete character (cascades to assignments)
    const { error: characterError } = await supabaseAdmin
      .from('characters')
      .delete()
      .eq('id', characterId);

    if (characterError) {
      return NextResponse.json(
        { error: `Failed to delete character: ${characterError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Character deleted successfully',
    });

  } catch (error) {
    console.error('❌ Character deletion error:', error);
    return NextResponse.json(
      { error: `Failed to delete character: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
