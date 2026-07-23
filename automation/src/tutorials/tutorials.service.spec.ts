import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { TutorialsService } from './tutorials.service';

describe('TutorialsService', () => {
  let dir: string;
  let service: TutorialsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tutorials-test-'));
    process.env.DATA_DIR = dir;
    service = new TutorialsService();

    for (const subject of service.findSubjects(true)) {
      service.removeSubject(subject.id);
    }
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const makeSubject = (title = 'Networking') =>
    service.createSubject({ title, summary: 'x', icon: '🌐' });

  const makeLesson = (subjectId: string, title = 'Lesson one') =>
    service.createTutorial({
      subjectId,
      title,
      content: 'Body text.',
    });

  describe('subjects', () => {
    it('creates one with a slug derived from the title', () => {
      const subject = service.createSubject({ title: 'Computer Networking' });

      expect(subject.slug).toBe('computer-networking');
      expect(subject.order).toBe(1);
      expect(subject.status).toBe('published');
    });

    it('gives the second subject the next order', () => {
      makeSubject('First');
      expect(makeSubject('Second').order).toBe(2);
    });

    it('disambiguates a duplicate slug rather than colliding', () => {
      makeSubject('Networking');
      expect(makeSubject('Networking').slug).toBe('networking-2');
    });

    it('regenerates the slug when the title changes, as posts do', () => {
      const subject = makeSubject('Networking');

      const updated = service.updateSubject(subject.id, {
        title: 'Networking Fundamentals',
      });

      expect(updated.title).toBe('Networking Fundamentals');
      expect(updated.slug).toBe('networking-fundamentals');
    });

    it('leaves the slug alone when the title is unchanged', () => {
      const subject = makeSubject('Networking');

      const updated = service.updateSubject(subject.id, {
        title: 'Networking',
        summary: 'Edited summary',
      });

      expect(updated.slug).toBe('networking');
    });

    it('hides drafts from the public list', () => {
      service.createSubject({ title: 'Secret', status: 'draft' });

      expect(service.findSubjects()).toHaveLength(0);
      expect(service.findSubjects(true)).toHaveLength(1);
    });

    it('throws for an unknown id', () => {
      expect(() => service.findSubjectById('nope')).toThrow(NotFoundException);
    });

    it('reorders with move, and stops at the ends', () => {
      const a = makeSubject('A');
      const b = makeSubject('B');

      service.moveSubject(b.id, 'up');
      expect(service.findSubjects().map((s) => s.title)).toEqual(['B', 'A']);

      service.moveSubject(b.id, 'up');
      expect(service.findSubjects().map((s) => s.title)).toEqual(['B', 'A']);

      expect(a.id).toBeDefined();
    });

    it('reorders subjects from a dragged sequence', () => {
      const a = makeSubject('A');
      const b = makeSubject('B');
      const c = makeSubject('C');

      service.reorderSubjects([c.id, a.id, b.id]);

      expect(service.findSubjects().map((s) => s.title)).toEqual([
        'C',
        'A',
        'B',
      ]);
    });

    it('deletes its lessons with it', () => {
      const subject = makeSubject();
      makeLesson(subject.id);
      makeLesson(subject.id, 'Lesson two');

      service.removeSubject(subject.id);

      expect(service.findSubjects(true)).toHaveLength(0);
      expect(service.allTutorials(true)).toHaveLength(0);
    });
  });

  describe('lessons', () => {
    it('numbers lessons within their subject, starting at 1', () => {
      const one = makeSubject('One');
      const two = makeSubject('Two');

      expect(makeLesson(one.id, 'A').order).toBe(1);
      expect(makeLesson(one.id, 'B').order).toBe(2);
      expect(makeLesson(two.id, 'C').order).toBe(1);
    });

    it('allows the same slug in different subjects', () => {
      const one = makeSubject('One');
      const two = makeSubject('Two');

      expect(makeLesson(one.id, 'Intro').slug).toBe('intro');
      expect(makeLesson(two.id, 'Intro').slug).toBe('intro');
    });

    it('disambiguates a duplicate slug inside one subject', () => {
      const subject = makeSubject();

      makeLesson(subject.id, 'Intro');
      expect(makeLesson(subject.id, 'Intro').slug).toBe('intro-2');
    });

    it('hides drafts from the public lesson list', () => {
      const subject = makeSubject();
      makeLesson(subject.id, 'Visible');
      service.createTutorial({
        subjectId: subject.id,
        title: 'Hidden',
        content: 'x',
        status: 'draft',
      });

      expect(service.lessons(subject.id)).toHaveLength(1);
      expect(service.lessons(subject.id, true)).toHaveLength(2);
    });

    it('reorders within a subject without touching another', () => {
      const one = makeSubject('One');
      const two = makeSubject('Two');

      makeLesson(one.id, 'A');
      const b = makeLesson(one.id, 'B');
      makeLesson(two.id, 'Z');

      service.moveTutorial(b.id, 'up');

      expect(service.lessons(one.id).map((l) => l.title)).toEqual(['B', 'A']);
      expect(service.lessons(two.id).map((l) => l.title)).toEqual(['Z']);
    });

    it('reorders lessons from a dragged sequence', () => {
      const subject = makeSubject();
      const a = makeLesson(subject.id, 'A');
      const b = makeLesson(subject.id, 'B');
      const c = makeLesson(subject.id, 'C');

      service.reorderTutorials(subject.id, [c.id, a.id, b.id]);

      expect(service.lessons(subject.id).map((l) => l.title)).toEqual([
        'C',
        'A',
        'B',
      ]);
      expect(service.lessons(subject.id).map((l) => l.order)).toEqual([
        1, 2, 3,
      ]);
    });

    it('reordering one subject leaves another untouched', () => {
      const one = makeSubject('One');
      const two = makeSubject('Two');

      const a = makeLesson(one.id, 'A');
      const b = makeLesson(one.id, 'B');
      makeLesson(two.id, 'X');
      makeLesson(two.id, 'Y');

      service.reorderTutorials(one.id, [b.id, a.id]);

      expect(service.lessons(one.id).map((l) => l.title)).toEqual(['B', 'A']);
      expect(service.lessons(two.id).map((l) => l.title)).toEqual(['X', 'Y']);
    });

    it('ignores ids from another subject when reordering', () => {
      const one = makeSubject('One');
      const two = makeSubject('Two');

      const a = makeLesson(one.id, 'A');
      const foreign = makeLesson(two.id, 'Foreign');

      service.reorderTutorials(one.id, [foreign.id, a.id]);

      expect(service.lessons(one.id).map((l) => l.title)).toEqual(['A']);
      expect(service.lessons(two.id).map((l) => l.title)).toEqual(['Foreign']);
    });

    it('closes the gap in ordering when a lesson is deleted', () => {
      const subject = makeSubject();
      makeLesson(subject.id, 'A');
      const b = makeLesson(subject.id, 'B');
      makeLesson(subject.id, 'C');

      service.removeTutorial(b.id);

      expect(service.lessons(subject.id).map((l) => l.order)).toEqual([1, 2]);
    });

    it('moves a lesson to the end when its subject changes', () => {
      const one = makeSubject('One');
      const two = makeSubject('Two');

      const moving = makeLesson(one.id, 'Moving');
      makeLesson(two.id, 'Existing');

      const updated = service.updateTutorial(moving.id, {
        subjectId: two.id,
        title: 'Moving',
        content: 'Body text.',
      });

      expect(updated.subjectId).toBe(two.id);
      expect(updated.order).toBe(2);
      expect(service.lessons(one.id)).toHaveLength(0);
    });

    it('finds a lesson by subject and lesson slug', () => {
      const subject = makeSubject();
      makeLesson(subject.id, 'Deep Dive');

      expect(service.findTutorial('networking', 'deep-dive').title).toBe(
        'Deep Dive',
      );
    });

    it('throws when the lesson is in a different subject', () => {
      const one = makeSubject('One');
      makeSubject('Two');
      makeLesson(one.id, 'Only Here');

      expect(() => service.findTutorial('two', 'only-here')).toThrow(
        NotFoundException,
      );
    });

    it('does not expose a draft lesson through findTutorial', () => {
      const subject = makeSubject();
      service.createTutorial({
        subjectId: subject.id,
        title: 'Hidden',
        content: 'x',
        status: 'draft',
      });

      expect(() => service.findTutorial('networking', 'hidden')).toThrow(
        NotFoundException,
      );
    });

    it('counts a view', () => {
      const subject = makeSubject();
      const created = makeLesson(subject.id);

      service.recordView(created.id);
      service.recordView(created.id);

      expect(service.findTutorialById(created.id).views).toBe(2);
    });

    it('ignores a view for an unknown lesson', () => {
      expect(() => service.recordView('nope')).not.toThrow();
    });
  });

  describe('navigation and totals', () => {
    it('gives previous and next within the subject', () => {
      const subject = makeSubject();
      const a = makeLesson(subject.id, 'A');
      const b = makeLesson(subject.id, 'B');
      const c = makeLesson(subject.id, 'C');

      const nav = service.neighbours(subject.id, b.id);

      expect(nav.previous?.id).toBe(a.id);
      expect(nav.next?.id).toBe(c.id);
      expect(nav.position).toBe(2);
      expect(nav.total).toBe(3);
    });

    it('keeps lessons inside a draft subject out of the public totals', () => {
      const hidden = service.createSubject({
        title: 'Hidden',
        status: 'draft',
      });
      makeLesson(hidden.id, 'A');
      makeLesson(hidden.id, 'B');

      const shown = makeSubject('Shown');
      makeLesson(shown.id, 'C');

      const totals = service.totals();

      expect(totals.subjects).toBe(1);
      expect(totals.tutorials).toBe(1);
    });

    it('keeps lessons inside a draft subject out of allTutorials', () => {
      const hidden = service.createSubject({
        title: 'Hidden',
        status: 'draft',
      });
      makeLesson(hidden.id, 'Buried');

      expect(service.allTutorials().map((t) => t.title)).not.toContain(
        'Buried',
      );
      expect(service.allTutorials(true).map((t) => t.title)).toContain(
        'Buried',
      );
    });

    it('keeps lessons inside a draft subject out of search results', () => {
      const hidden = service.createSubject({
        title: 'Hidden',
        status: 'draft',
      });
      makeLesson(hidden.id, 'Unreachable Topic');

      const shown = makeSubject('Shown');
      makeLesson(shown.id, 'Reachable Topic');

      expect(service.search('topic').map((t) => t.title)).toEqual([
        'Reachable Topic',
      ]);
    });

    it('totals only published content', () => {
      const subject = makeSubject();
      makeLesson(subject.id, 'A');
      service.createTutorial({
        subjectId: subject.id,
        title: 'Draft',
        content: 'x',
        status: 'draft',
      });

      const totals = service.totals();

      expect(totals.subjects).toBe(1);
      expect(totals.tutorials).toBe(1);
    });
  });

  it('persists across a restart', () => {
    const subject = makeSubject();
    makeLesson(subject.id, 'Survives');

    const reopened = new TutorialsService();

    expect(reopened.findSubjects()).toHaveLength(1);
    expect(reopened.lessons(subject.id).map((l) => l.title)).toEqual([
      'Survives',
    ]);
  });

  it('seeds a starter subject on a fresh store', () => {
    const fresh = mkdtempSync(join(tmpdir(), 'tutorials-seed-'));
    process.env.DATA_DIR = fresh;

    const seeded = new TutorialsService();

    expect(seeded.findSubjects().length).toBeGreaterThanOrEqual(1);
    expect(seeded.allTutorials().length).toBeGreaterThanOrEqual(3);

    rmSync(fresh, { recursive: true, force: true });
  });
});
