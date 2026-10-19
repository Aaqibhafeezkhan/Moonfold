# Memories

Memories are short notes that agents receive at the start of every turn, so you don't have to
repeat a preference in each conversation. Manage them in **Settings → Memories**. Each environment
keeps its own memories on its own machine.

## Add a memory

Choose **Add memory**, write it in a sentence or two, and pick where it applies: all projects, or
one project. You can also tell an agent "remember that…" in a thread; it saves the memory itself
for that thread's project, and Settings shows it as **Saved by an agent** with a link to the thread
it came from. To make it apply everywhere, edit it there.

What you write is treated as your own instruction. A memory an agent saved is passed on as
background information instead, so an agent misled by something it read cannot turn that into an
instruction for later turns. Editing an agent's memory makes it yours.

## Turn memories off

**Use memories** turns them off for the whole environment: agents receive none and cannot save
new ones. To leave them out of one thread, open the thread's menu and choose **Memories → Don't use
memories**; choose **Use memories** to bring them back.

## Which agents use memories

Codex and Claude Code turns receive memories. Other providers do not receive them yet. A change
applies from the next turn.

If you turned on Codex's own memories in its configuration, Codex may keep what you ask it to
remember in its own memory instead, where other providers don't see it. Say "remember this in
Moonfold" to save it here.
